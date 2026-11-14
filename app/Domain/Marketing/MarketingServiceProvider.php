<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Google\GoogleAdsClient;
use App\Domain\Marketing\Google\GoogleAnalyticsClient;
use App\Domain\Marketing\Google\GoogleConnection;
use App\Domain\Marketing\Google\SearchConsoleClient;
use App\Domain\Marketing\Providers\GoogleAdsProvider;
use App\Domain\Marketing\Providers\GoogleAnalyticsProvider;
use App\Domain\Marketing\Providers\GoogleTagManagerProvider;
use App\Domain\Marketing\Providers\MetaConversionsProvider;
use App\Domain\Marketing\Providers\MetaPixelProvider;
use App\Domain\Marketing\Providers\SearchConsoleProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Binds the marketing provider drivers.
 *
 * Drivers are registered by registry key rather than hard-wired into the services,
 * so the core never names a provider class and a test can substitute one. A key with
 * no bound driver is reported honestly by MarketingIntegrationService rather than
 * treated as working.
 */
class MarketingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(GoogleConnection::class);
        $this->app->singleton(GoogleAnalyticsClient::class);
        $this->app->singleton(SearchConsoleClient::class);
        $this->app->singleton(GoogleAdsClient::class);
    }

    public function boot(): void
    {
        $this->registerDrivers();
        $this->registerRateLimiters();
    }

    protected function registerDrivers(): void
    {
        $this->app->bind('marketing.provider.meta_pixel', fn () => new MetaPixelProvider);
        $this->app->bind('marketing.provider.meta_conversions', fn () => new MetaConversionsProvider);
        $this->app->bind('marketing.provider.google_analytics', fn ($app) => new GoogleAnalyticsProvider(
            $app->make(GoogleConnection::class),
            $app->make(GoogleAnalyticsClient::class),
        ));
        $this->app->bind('marketing.provider.google_tag_manager', fn () => new GoogleTagManagerProvider);
        $this->app->bind('marketing.provider.search_console', fn ($app) => new SearchConsoleProvider(
            $app->make(GoogleConnection::class),
            $app->make(SearchConsoleClient::class),
        ));
        $this->app->bind('marketing.provider.google_ads', fn ($app) => new GoogleAdsProvider(
            $app->make(GoogleConnection::class),
            $app->make(GoogleAdsClient::class),
        ));
    }

    /**
     * The public ingestion endpoints are unauthenticated, so they are rate limited
     * per visitor where one is presented and per address otherwise.
     */
    protected function registerRateLimiters(): void
    {
        RateLimiter::for('marketing-events', fn (Request $request) => Limit::perMinute(60)->by(
            (string) ($request->cookie(VisitorTracker::COOKIE) ?: $request->ip())
        ));

        RateLimiter::for('marketing-consent', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));
    }
}
