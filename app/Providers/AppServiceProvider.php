<?php

namespace App\Providers;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Policies\BranchPolicy;
use App\Domain\Identity\Policies\UserPolicy;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Product;
use App\Domain\PlatformSettings\MailConfigurator;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\Policies\TenantPolicy;
use App\Domain\Tenancy\TenantContext;
use App\Listeners\LogOutboundEmail;
use App\Listeners\RecordAuthSecurityEvents;
use App\Listeners\RecordScheduledTask;
use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Mail\Events\MessageSendingFailed;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
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

        Gate::define('platform.access', fn (User $user) => $user->isPlatformAdmin());

        // Permission catalog drives authorization. Tenant users resolve their
        // role permissions; platform admins resolve platform.* only.
        Gate::before(function (User $user, string $ability) {
            return $user->hasPermission($ability) ? true : null;
        });

        // Email operations: record outbound email and apply UI-configured mail settings.
        Event::listen(MessageSent::class, [LogOutboundEmail::class, 'sent']);
        Event::listen(MessageSendingFailed::class, [LogOutboundEmail::class, 'failed']);

        // Scheduler monitoring: record real task executions.
        Event::listen(ScheduledTaskFinished::class, [RecordScheduledTask::class, 'finished']);
        Event::listen(ScheduledTaskFailed::class, [RecordScheduledTask::class, 'failed']);

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
            $lifetime = $this->app->make(\App\Domain\PlatformSettings\PlatformSettings::class)->get('security.session_lifetime_minutes');

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
