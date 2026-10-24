<?php

use App\Http\Middleware\AddCorrelationContext;
use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureFeature;
use App\Http\Middleware\EnsureOnboardingComplete;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsurePlatformOperational;
use App\Http\Middleware\EnsurePlatformPermission;
use App\Http\Middleware\EnsureTenantIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveActiveBranch;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\ResolveQrContext;
use App\Http\Middleware\ResolveDiningSession;
use App\Http\Middleware\SetLocale;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            AddCorrelationContext::class,
            AddSecurityHeaders::class,
            ResolveTenant::class,
            ResolveActiveBranch::class,
            SetLocale::class,
            EnsureTenantIsActive::class,
            EnsurePlatformOperational::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'tenant.active' => EnsureTenantIsActive::class,
            'branch.active' => ResolveActiveBranch::class,
            'permission' => EnsurePermission::class,
            'onboarding.completed' => EnsureOnboardingComplete::class,
            'platform' => EnsurePlatformAdmin::class,
            'platform.permission' => EnsurePlatformPermission::class,
            'feature' => EnsureFeature::class,
            'qr.context' => ResolveQrContext::class,
            'qr.session' => ResolveDiningSession::class,
        ]);

        // Provider webhooks / gateway callbacks are authenticated by signature or
        // server-side verification, not CSRF tokens.
        $middleware->validateCsrfTokens(except: ['webhooks/*', 'payments/*']);
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Subscription lifecycle and billing.
        $schedule->command('subscriptions:process')->dailyAt('01:00');
        $schedule->command('billing:warn-expiring')->dailyAt('09:00');
        $schedule->command('billing:renew-subscriptions')->dailyAt('06:00');
        $schedule->command('usage:record')->dailyAt('02:00');

        // Operational alerts.
        $schedule->command('alerts:low-stock')->hourly();
        $schedule->command('notifications:daily-sales')->dailyAt('23:30');

        // Housekeeping.
        $schedule->command('queue:prune-failed --hours=168')->weekly();
        $schedule->command('db:backup')->dailyAt('03:00');
        $schedule->command('db:verify-backup')->dailyAt('04:00');
        $schedule->command('backups:prune')->weekly();
        $schedule->command('app:health')->everyFiveMinutes();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
