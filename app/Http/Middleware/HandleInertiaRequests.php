<?php

namespace App\Http\Middleware;

use App\Domain\Billing\PricingRegionContext;
use App\Domain\Communications\AnnouncementService;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\TenantContext;
use App\Support\AppVersion;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $tenant = app(TenantContext::class)->tenant();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'permissions' => fn () => $user ? $user->allPermissions() : [],
                'platform_permissions' => fn () => $user && $user->isPlatformAdmin()
                    ? $user->allPermissions()->filter(fn (string $p) => str_starts_with($p, 'platform.'))->values()
                    : [],
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->getKey(),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'logo_url' => $tenant->logo_url,
                'status' => $tenant->status->value,
                'on_trial' => $tenant->onTrial(),
                'onboarding_completed' => $tenant->hasCompletedOnboarding(),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'import_result' => fn () => $request->session()->get('import_result'),
            ],
            'impersonation' => $request->session()->has('impersonator_id') ? [
                'admin_id' => $request->session()->get('impersonator_id'),
                'tenant_id' => $request->session()->get('impersonating_tenant_id'),
            ] : null,
            'notifications' => [
                'unread' => fn () => $user ? $user->unreadNotifications()->count() : 0,
            ],
            // Platform admin bell (the platform header has its own count so the
            // Notifications page can keep using `notifications` for its list).
            'platform_notifications' => [
                'unread' => fn () => $user && $user->isPlatformAdmin() ? $user->unreadNotifications()->count() : 0,
            ],
            // Public websocket connection values for the browser (never the secret).
            'realtime' => fn () => app(\App\Domain\Realtime\RealtimeManager::class)->publicConfig(),
            // Orders awaiting staff confirmation (QR orders when auto-accept is off,
            // table-staff orders under central approval). Tenant + branch global
            // scopes apply, so this is limited to the user's branches.
            'pending_approvals' => fn () => ($user && $tenant && $user->hasPermission('orders.approve'))
                ? (int) \App\Domain\Orders\Models\Order::query()
                    ->where('acceptance_status', 'pending')
                    ->count()
                : 0,
            'branches' => fn () => $user && $tenant
                ? $tenant->branches()->whereIn('id', $user->accessibleBranchIds())->active()->orderBy('name')->get(['id', 'name', 'code', 'currency'])->map(fn ($b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'code' => $b->code,
                    'currency' => $b->currency ?? $tenant->getSetting('region.currency') ?? 'USD',
                ])->values()
                : [],
            'active_branch_id' => fn () => app(TenantContext::class)->branchId(),
            // Tenant-wide currency for money formatting on authenticated pages.
            'currency' => fn () => $tenant?->getSetting('region.currency') ?? 'USD',
            'announcements' => fn () => $tenant
                ? app(AnnouncementService::class)->forTenant($tenant)
                : [],
            'locale' => app()->getLocale(),
            // Detected pricing region (Bangladesh / International) for the public site.
            'pricing_region' => fn () => app(PricingRegionContext::class)->region(),
            'pricing_region_source' => fn () => app(PricingRegionContext::class)->source(),
            'pricing_country' => fn () => app(PricingRegionContext::class)->country(),
            'pricing_country_cookie' => (string) config('platform.pricing.country_cookie', 'pricing_country'),
            'pricing_geo_lookup_url' => (string) config('platform.pricing.geo_lookup_url', ''),
            'version' => [
                'app' => fn () => app(AppVersion::class)->version(),
                'commit' => fn () => app(AppVersion::class)->commit(),
            ],
            'locales' => collect(config('app.locales', ['en' => 'English']))
                ->map(fn ($label, $code) => ['value' => $code, 'label' => $label])->values(),
            // Enabled plan features (null = unrestricted, e.g. no subscription).
            'features' => $tenant === null ? null : collect([
                'pos', 'kitchen', 'tables', 'menu', 'qr_dining', 'inventory',
                'purchasing', 'waste', 'transfers', 'accounts', 'reports',
            ])->filter(fn (string $feature) => $tenant->hasFeature($feature))->values(),
        ];
    }
}
