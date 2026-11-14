<?php

namespace App\Http\Controllers;

use App\Domain\Billing\PricingRegionContext;
use App\Domain\Marketing\Enums\InquiryCategory;
use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\LeadService;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\PricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class MarketingController extends Controller
{
    /**
     * Published resource guides.
     *
     * Kept in step with `ARTICLES` in resources/js/Pages/Marketing/Resources/Index.tsx
     * and with the sitemap: an unknown slug must 404 rather than silently render a
     * different article's content.
     *
     * @var list<string>
     */
    /** @var list<string> */
    public const PRODUCT_SLUGS = [
        'qr-ordering', 'digital-menu', 'table-management', 'order-management', 'kitchen-display',
        'billing-payments', 'reports', 'branch-management', 'staff-roles', 'inventory',
    ];

    /** Features that keep their own page; the rest redirect to a product page. */
    /** @var list<string> */
    public const FEATURE_SLUGS = [
        'restaurant-pos',
        'cash-management',
        'expense-management',
        'purchasing-suppliers',
        'customer-management',
    ];

    /** @var array<string, string> */
    public const MOVED_FEATURES = [
        'kitchen-display' => 'kitchen-display',
        'table-management' => 'table-management',
        'menu-management' => 'digital-menu',
        'order-management' => 'order-management',
        'reports-analytics' => 'reports',
        'staff-management' => 'staff-roles',
        'multi-branch-management' => 'branch-management',
        'inventory-management' => 'inventory',
    ];

    /** @var list<string> */
    public const SOLUTION_WORKFLOW_SLUGS = [
        'dine-in-qr-ordering', 'table-order-management', 'kitchen-workflow',
        'faster-restaurant-service', 'restaurant-billing-checkout', 'restaurant-reporting',
    ];

    /** @var list<string> */
    public const SOLUTION_VENUE_SLUGS = [
        'restaurants',
        'cafes',
        'cloud-kitchens',
        'quick-service-restaurants',
        'takeaway-delivery',
        'multi-location-restaurants',
    ];

    /** @var list<string> */
    public const RESOURCE_SLUGS = [
        'calculating-true-food-cost-percentage',
        'preventing-cash-shift-variances',
        'reducing-food-waste-in-prep-kitchens',
        'pos-hardware-buying-guide',
        'optimizing-peak-rush-ticket-times',
        'multi-branch-central-catalog-playbook',
    ];

    /**
     * Get platform default billing currency configured in Platform Settings.
     */
    protected function getPlatformCurrency(): string
    {
        try {
            $settings = app(PlatformSettings::class);

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
     * Public plans for the visitor's region, priced in that region's currency.
     * Plans without a price in the region currency are omitted — never show a
     * different region's currency, and never substitute fabricated prices.
     *
     * @return list<array<string, mixed>>
     */
    protected function getPlans(): array
    {
        $region = $this->regionContext()->region();
        $regionCurrency = $this->regionContext()->currencyFor($region);

        try {
            return Plan::query()
                ->where('is_active', true)
                ->where('visibility', 'public')
                ->forRegion($region)
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Plan $plan) => $this->shapePlan($plan, $regionCurrency))
                ->filter()
                ->values()
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function regionContext(): PricingRegionContext
    {
        return app(PricingRegionContext::class);
    }

    /**
     * Shape a plan for the public site, priced in the visitor's region currency
     * when a price exists for it (falls back to the plan's own currency).
     *
     * @return array<string, mixed>
     */
    protected function shapePlan(Plan $plan, string $currency): ?array
    {
        $pricing = app(PricingService::class);

        $monthly = $pricing->priceFor($plan, $currency, BillingCycle::Monthly);
        $yearly = $pricing->priceFor($plan, $currency, BillingCycle::Yearly);

        // No price in this region's currency — omit the plan rather than show a
        // different currency or a guessed price.
        if ($monthly === null || $yearly === null) {
            return null;
        }

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'description' => $plan->description,
            'currency' => $currency,
            'price_monthly' => (float) $monthly,
            'price_yearly' => (float) $yearly,
            'trial_days' => $plan->trial_days ?? 14,
            'features' => $plan->features ?? [],
            'limits' => $plan->limits ?? [],
            'is_popular' => (bool) $plan->is_featured,
        ];
    }

    /**
     * Region props shared by the pages that show pricing.
     *
     * @return array<string, mixed>
     */
    protected function regionProps(): array
    {
        $region = $this->regionContext()->region();

        return [
            'regionCurrency' => $this->regionContext()->currencyFor($region),
            'regionLabel' => (string) config("platform.pricing.regions.{$region}.label", ucfirst($region)),
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
            ...$this->regionProps(),
        ]);
    }

    /**
     * Legacy singular product URL, kept for inbound links.
     */
    public function product(): RedirectResponse
    {
        return redirect()->route('products.index', [], 301);
    }

    /**
     * Products overview.
     */
    public function products(): Response
    {
        return Inertia::render('Marketing/Products/Index', [
            'canonical' => route('products.index'),
        ]);
    }

    /**
     * Individual product page. Slugs mirror resources/js/Components/Marketing/Catalog/catalog.ts.
     */
    public function productPage(string $product): Response
    {
        abort_unless(in_array($product, self::PRODUCT_SLUGS, true), 404);

        return Inertia::render('Marketing/Products/Show', [
            'slug' => $product,
            'canonical' => route('products.show', $product),
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
    public function feature(string $feature): Response|RedirectResponse
    {
        // Modules that now have a dedicated product page.
        if (isset(self::MOVED_FEATURES[$feature])) {
            return redirect()->route('products.show', self::MOVED_FEATURES[$feature], 301);
        }

        if (! in_array($feature, self::FEATURE_SLUGS, true)) {
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
        return Inertia::render('Marketing/Solutions/Index', [
            'canonical' => route('solutions.index'),
        ]);
    }

    /**
     * Individual solution page.
     */
    public function solution(string $solution): Response
    {
        // Workflow solutions; slugs mirror SOLUTION_WORKFLOWS in the frontend catalog.
        if (in_array($solution, self::SOLUTION_WORKFLOW_SLUGS, true)) {
            return Inertia::render('Marketing/Solutions/Workflow', [
                'slug' => $solution,
                'canonical' => route('solutions.show', $solution),
                'platformCurrency' => $this->getPlatformCurrency(),
            ]);
        }

        if (! in_array($solution, self::SOLUTION_VENUE_SLUGS, true)) {
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
            ...$this->regionProps(),
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
    public function contactSubmit(Request $request, LeadService $leads): RedirectResponse
    {
        $thanks = 'Thank you! Your message has been received. A Touch Dine restaurant specialist will contact you within 2 business hours.';

        // Honeypot: a field no person can see. A bot fills it in, so the submission is
        // silently accepted and discarded rather than creating a lead or an error.
        if (trim((string) $request->input('website', '')) !== '') {
            return back()->with('success', $thanks);
        }

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150',
            'phone' => 'nullable|string|max:40',
            'restaurant_name' => 'required|string|max:150',
            'venue_type' => 'required|string|in:restaurant,cafe,cloud_kitchen,qsr,takeaway,group,other',
            'branches_count' => 'required|string|in:1,2-5,6-15,15+',
            'inquiry_category' => 'required|string|in:'.implode(',', InquiryCategory::values()),
            'message' => 'required|string|min:10|max:2000',
            'marketing_consent' => 'nullable|boolean',
        ]);

        // Attribution comes from the first-party visitor record, so the form itself
        // needs no hidden tracking fields and cannot be gamed into a false campaign.
        // The public site proposes the free trial directly, so this channel is a
        // sales enquiry rather than a demo booking.
        $leads->capture(
            $data + ['consent_marketing' => (bool) ($data['marketing_consent'] ?? false)],
            $request,
            LeadSource::ContactForm,
        );

        return back()->with('success', $thanks);
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
     *
     * Only published guides resolve. Every unknown slug used to return 200 with the
     * first article's content, which is a soft 404: it invited search engines to
     * index an unlimited number of duplicate URLs and made the sitemap's URLs
     * disagree with what the site actually publishes.
     */
    public function resourceArticle(string $slug): Response
    {
        abort_unless(in_array($slug, self::RESOURCE_SLUGS, true), 404);

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
