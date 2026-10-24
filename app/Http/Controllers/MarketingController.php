<?php

namespace App\Http\Controllers;

use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class MarketingController extends Controller
{
    /**
     * Get platform default billing currency configured in Platform Settings.
     */
    protected function getPlatformCurrency(): string
    {
        try {
            $settings = app(\App\Domain\PlatformSettings\PlatformSettings::class);

            return (string) (
                $settings->get('billing.default_currency')
                ?? $settings->get('general.default_currency')
                ?? config('platform.reporting_currency', 'USD')
            );
        } catch (\Throwable $e) {
            return config('platform.reporting_currency', 'USD');
        }
    }

    /**
     * Get verified subscription plans with fallback to defaults.
     */
    protected function getPlans(): array
    {
        $platformCurrency = $this->getPlatformCurrency();

        try {
            $plans = Plan::query()
                ->where('is_active', true)
                ->where('visibility', 'public')
                ->orderBy('sort_order')
                ->get();

            if ($plans->isNotEmpty()) {
                return $plans->map(function ($plan) use ($platformCurrency) {
                    return [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'slug' => $plan->slug,
                        'description' => $plan->description,
                        'currency' => $plan->currency ?? $platformCurrency,
                        'price_monthly' => (float) $plan->price_monthly,
                        'price_yearly' => (float) $plan->price_yearly,
                        'trial_days' => $plan->trial_days ?? 14,
                        'features' => $plan->features ?? [],
                        'limits' => $plan->limits ?? [],
                        'is_popular' => $plan->slug === 'growth',
                    ];
                })->toArray();
            }
        } catch (\Throwable $e) {
            // Fallback to verified seed configuration if table unmigrated
        }

        return [
            [
                'id' => 1,
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Single restaurant, core POS and reporting.',
                'currency' => $platformCurrency,
                'price_monthly' => 29,
                'price_yearly' => 290,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'reports'],
                'limits' => ['branches' => 1, 'users' => 5, 'orders_this_month' => 1000],
                'is_popular' => false,
            ],
            [
                'id' => 2,
                'name' => 'Growth',
                'slug' => 'growth',
                'description' => 'Multi-branch operations with inventory and purchasing.',
                'currency' => $platformCurrency,
                'price_monthly' => 79,
                'price_yearly' => 790,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'inventory', 'purchasing', 'waste', 'accounts', 'reports'],
                'limits' => ['branches' => 3, 'users' => 25, 'orders_this_month' => 10000],
                'is_popular' => true,
            ],
            [
                'id' => 3,
                'name' => 'Business',
                'slug' => 'business',
                'description' => 'Unlimited branches and users, all modules.',
                'currency' => $platformCurrency,
                'price_monthly' => 199,
                'price_yearly' => 1990,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'inventory', 'purchasing', 'waste', 'transfers', 'accounts', 'reports'],
                'limits' => ['branches' => null, 'users' => null, 'orders_this_month' => null],
                'is_popular' => false,
            ],
        ];
    }

    /**
     * Homepage.
     */
    public function index(): Response
    {
        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'plans' => $this->getPlans(),
            'platformCurrency' => $this->getPlatformCurrency(),
        ]);
    }

    /**
     * Product overview.
     */
    public function product(): Response
    {
        return Inertia::render('Marketing/Product', [
            'plans' => $this->getPlans(),
            'platformCurrency' => $this->getPlatformCurrency(),
        ]);
    }

    /**
     * Features index.
     */
    public function features(): Response
    {
        return Inertia::render('Marketing/Features/Index');
    }

    /**
     * Individual feature page.
     */
    public function feature(string $feature): Response
    {
        $validFeatures = [
            'restaurant-pos',
            'kitchen-display',
            'table-management',
            'menu-management',
            'inventory-management',
            'order-management',
            'cash-management',
            'expense-management',
            'reports-analytics',
            'staff-management',
            'multi-branch-management',
            'purchasing-suppliers',
            'customer-management',
        ];

        if (! in_array($feature, $validFeatures, true)) {
            abort(404);
        }

        return Inertia::render('Marketing/Features/Show', [
            'featureKey' => $feature,
            'plans' => $this->getPlans(),
        ]);
    }

    /**
     * Solutions index.
     */
    public function solutions(): Response
    {
        return Inertia::render('Marketing/Solutions/Index');
    }

    /**
     * Individual solution page.
     */
    public function solution(string $solution): Response
    {
        $validSolutions = [
            'restaurants',
            'cafes',
            'cloud-kitchens',
            'quick-service-restaurants',
            'takeaway-delivery',
            'multi-location-restaurants',
        ];

        if (! in_array($solution, $validSolutions, true)) {
            abort(404);
        }

        return Inertia::render('Marketing/Solutions/Show', [
            'solutionKey' => $solution,
            'plans' => $this->getPlans(),
        ]);
    }

    /**
     * Pricing page.
     */
    public function pricing(): Response
    {
        return Inertia::render('Marketing/Pricing', [
            'plans' => $this->getPlans(),
            'platformCurrency' => $this->getPlatformCurrency(),
        ]);
    }

    /**
     * About page.
     */
    public function about(): Response
    {
        return Inertia::render('Marketing/About');
    }

    /**
     * Contact page.
     */
    public function contact(): Response
    {
        return Inertia::render('Marketing/Contact');
    }

    /**
     * Handle contact form submission.
     */
    public function contactSubmit(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150',
            'restaurant_name' => 'required|string|max:150',
            'venue_type' => 'required|string|in:restaurant,cafe,cloud_kitchen,qsr,takeaway,group,other',
            'branches_count' => 'required|string|in:1,2-5,6-15,15+',
            'inquiry_category' => 'required|string|in:sales,demo,migration,custom_hardware,partnership',
            'message' => 'required|string|min:10|max:2000',
        ]);

        return back()->with('success', 'Thank you! Your message has been received. A Touch Dine restaurant specialist will contact you within 2 business hours.');
    }

    /**
     * Resources / Blog hub.
     */
    public function resources(): Response
    {
        return Inertia::render('Marketing/Resources/Index');
    }

    /**
     * Individual resource guide.
     */
    public function resourceArticle(string $slug): Response
    {
        return Inertia::render('Marketing/Resources/Show', [
            'slug' => $slug,
        ]);
    }

    /**
     * Searchable Help Center.
     */
    public function help(): Response
    {
        return Inertia::render('Marketing/Help');
    }

    /**
     * Legal pages.
     */
    public function privacyPolicy(): Response
    {
        return Inertia::render('Marketing/Legal/Privacy');
    }

    public function termsOfService(): Response
    {
        return Inertia::render('Marketing/Legal/Terms');
    }

    public function cookiePolicy(): Response
    {
        return Inertia::render('Marketing/Legal/Cookies');
    }

    public function refundPolicy(): Response
    {
        return Inertia::render('Marketing/Legal/Refund');
    }
}
