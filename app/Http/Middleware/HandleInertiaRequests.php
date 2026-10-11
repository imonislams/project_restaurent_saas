<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\TenantContext;
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
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->getKey(),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status->value,
                'on_trial' => $tenant->onTrial(),
                'onboarding_completed' => $tenant->hasCompletedOnboarding(),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'impersonation' => $request->session()->has('impersonator_id') ? [
                'admin_id' => $request->session()->get('impersonator_id'),
                'tenant_id' => $request->session()->get('impersonating_tenant_id'),
            ] : null,
            'notifications' => [
                'unread' => fn () => $user ? $user->unreadNotifications()->count() : 0,
            ],
            'locale' => app()->getLocale(),
            'locales' => collect(config('app.locales', ['en' => 'English']))
                ->map(fn ($label, $code) => ['value' => $code, 'label' => $label])->values(),
            // Enabled plan features (null = unrestricted, e.g. no subscription).
            'features' => $tenant === null ? null : collect([
                'pos', 'kitchen', 'tables', 'menu', 'inventory',
                'purchasing', 'waste', 'transfers', 'accounts', 'reports',
            ])->filter(fn (string $feature) => $tenant->hasFeature($feature))->values(),
        ];
    }
}
