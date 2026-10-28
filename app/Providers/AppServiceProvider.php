<?php

namespace App\Providers;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Billing\PricingRegionContext;
use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Policies\BranchPolicy;
use App\Domain\Demo\DemoContext;
use App\Domain\Demo\DemoRecorder;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Policies\RolePolicy;
use App\Domain\Identity\Policies\UserPolicy;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Product;
use App\Domain\PlatformSettings\MailConfigurator;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Realtime\BroadcastConfigurator;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\Policies\TenantPolicy;
use App\Domain\Tenancy\TenantContext;
use App\Listeners\LogOutboundEmail;
use App\Listeners\NotifyPlatformOnFailedJob;
use App\Listeners\RecordAuthSecurityEvents;
use App\Listeners\RecordScheduledTask;
use App\Models\User;
use App\Support\AppVersion;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSendingFailed;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
        $this->app->singleton(PricingRegionContext::class);

        // Marks the demo batch currently generating, so the ledger recorder can
        // trace every row a demo run creates. Always null outside a run.
        $this->app->singleton(DemoContext::class);

        // Must be a singleton: the recording hook resolves it on every model
        // write, so separate instances would each buffer a single row and never
        // reach the flush threshold — silently losing the whole ledger.
        $this->app->singleton(DemoRecorder::class);

        // Memoised so the git commit probe runs at most once per request.
        $this->app->singleton(AppVersion::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Uploaded media (product images, logos, avatars) must be served from
        // the origin the request actually arrived on. Basing the public disk's
        // URL on APP_URL pins every <img> to a single host/port, so images 404
        // whenever the app is opened through MAMP, a LAN address, a virtual
        // host or a sub-directory instead of the configured APP_URL.
        config(['filesystems.disks.public.url' => url('/storage')]);

        Vite::prefetch(concurrency: 3);

        $this->registerQrRateLimiters();

        // Stable morph aliases so stored stock records survive class moves.
        Relation::morphMap([
            'product' => Product::class,
            'ingredient' => Ingredient::class,
        ]);

        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(Branch::class, BranchPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);

        Gate::define('platform.access', fn (User $user) => $user->isPlatformAdmin());

        // Permission catalog drives authorization. Tenant users resolve their
        // role permissions; platform admins resolve platform.* only.
        Gate::before(function (User $user, string $ability) {
            return $user->hasPermission($ability) ? true : null;
        });

        // Demo data: while a demo batch is generating, every tenant-scoped row
        // it creates is traced in the demo ledger. The recorder only runs when a
        // batch is active, so this costs one boolean check on every other write,
        // and it captures rows written indirectly by the domain services too.
        Event::listen('eloquent.created: *', function (string $event, array $payload) {
            $model = $payload[0] ?? null;

            if (! $model instanceof Model || ! app(DemoContext::class)->active()) {
                return;
            }

            if (! in_array(BelongsToTenant::class, class_uses_recursive($model), true)) {
                return;
            }

            if ($model instanceof AuditLog || $model instanceof DemoDataRecord) {
                return;
            }

            app(DemoRecorder::class)->remember($model);
        });

        // Email operations: record outbound email and apply UI-configured mail settings.
        Event::listen(MessageSent::class, [LogOutboundEmail::class, 'sent']);
        Event::listen(MessageSendingFailed::class, [LogOutboundEmail::class, 'failed']);

        // Scheduler monitoring: record real task executions.
        Event::listen(ScheduledTaskFinished::class, [RecordScheduledTask::class, 'finished']);
        Event::listen(ScheduledTaskFailed::class, [RecordScheduledTask::class, 'failed']);

        // Queue monitoring: a failed job is an operator alert, not just a row.
        Event::listen(JobFailed::class, [NotifyPlatformOnFailedJob::class, 'handle']);

        // Security center: record authentication events.
        Event::listen(Login::class, [RecordAuthSecurityEvents::class, 'login']);
        Event::listen(Failed::class, [RecordAuthSecurityEvents::class, 'failed']);
        Event::listen(Logout::class, [RecordAuthSecurityEvents::class, 'logout']);

        try {
            $this->app->make(MailConfigurator::class)->apply();
        } catch (\Throwable) {
            // Mail settings unavailable (e.g. before migration) — keep env config.
        }

        try {
            $this->app->make(BroadcastConfigurator::class)->apply();
        } catch (\Throwable) {
            // Real-time settings unavailable — keep the configured broadcaster.
        }

        try {
            $lifetime = $this->app->make(PlatformSettings::class)->get('security.session_lifetime_minutes');

            if ($lifetime) {
                config(['session.lifetime' => (int) $lifetime]);
            }
        } catch (\Throwable) {
            // Settings unavailable — keep the configured session lifetime.
        }
    }

    /**
     * Rate limiters for the public QR dining endpoints. These protect the
     * unauthenticated surface from abuse and brute-force token probing.
     */
    protected function registerQrRateLimiters(): void
    {
        RateLimiter::for('qr-public', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        RateLimiter::for('qr-session', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('qr-order', fn (Request $request) => Limit::perMinute(20)->by(
            $request->header('X-Dining-Token') ?: $request->ip()
        ));
    }
}
