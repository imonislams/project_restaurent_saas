<?php

namespace Tests\Feature\Marketing;

use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketingRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_is_accessible(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    public function test_product_page_is_accessible(): void
    {
        $response = $this->get('/product');
        $response->assertStatus(200);
    }

    public function test_features_hub_and_all_subpages_are_accessible(): void
    {
        $response = $this->get('/features');
        $response->assertStatus(200);

        $features = [
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

        foreach ($features as $slug) {
            $subResponse = $this->get("/features/{$slug}");
            $subResponse->assertStatus(200);
        }
    }

    public function test_solutions_hub_and_all_subpages_are_accessible(): void
    {
        $response = $this->get('/solutions');
        $response->assertStatus(200);

        $solutions = [
            'restaurants',
            'cafes',
            'cloud-kitchens',
            'quick-service-restaurants',
            'takeaway-delivery',
            'multi-location-restaurants',
        ];

        foreach ($solutions as $slug) {
            $subResponse = $this->get("/solutions/{$slug}");
            $subResponse->assertStatus(200);
        }
    }

    public function test_pricing_page_is_accessible_with_seeded_plans(): void
    {
        $this->seed(PlanSeeder::class);

        $response = $this->get('/pricing');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Marketing/Pricing')
            ->has('plans', 3)
            ->has('platformCurrency')
        );
    }

    public function test_pricing_syncs_with_platform_settings_currency(): void
    {
        app(\App\Domain\PlatformSettings\PlatformSettings::class)->set('billing.default_currency', 'BDT', 'billing');

        $response = $this->get('/pricing');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Marketing/Pricing')
            ->where('platformCurrency', 'BDT')
        );
    }

    public function test_about_page_is_accessible(): void
    {
        $response = $this->get('/about');
        $response->assertStatus(200);
    }

    public function test_contact_page_is_accessible_and_submits(): void
    {
        $response = $this->get('/contact');
        $response->assertStatus(200);

        $submitResponse = $this->post('/contact', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'restaurant_name' => 'John Bistro',
            'venue_type' => 'restaurant',
            'branches_count' => '1',
            'inquiry_category' => 'demo',
            'message' => 'I would like a live walkthrough of the inventory module.',
        ]);

        $submitResponse->assertRedirect('/contact');
        $submitResponse->assertSessionHas('success');
    }

    public function test_resources_hub_and_articles_are_accessible(): void
    {
        $response = $this->get('/resources');
        $response->assertStatus(200);

        $articles = [
            'restaurant-pos-buying-guide-2026',
            'food-waste-recipe-costing-guide',
            'multi-branch-centralized-kitchen-sop',
            'speed-of-service-kds-optimization',
            'opening-closing-cash-drawer-audit-checklist',
        ];

        foreach ($articles as $slug) {
            $subResponse = $this->get("/resources/{$slug}");
            $subResponse->assertStatus(200);
        }
    }

    public function test_help_center_is_accessible(): void
    {
        $response = $this->get('/help');
        $response->assertStatus(200);
    }

    public function test_legal_pages_are_accessible(): void
    {
        $legalPages = [
            '/privacy-policy',
            '/terms-of-service',
            '/cookie-policy',
            '/refund-policy',
        ];

        foreach ($legalPages as $uri) {
            $response = $this->get($uri);
            $response->assertStatus(200);
        }
    }

    public function test_sitemap_and_robots_are_accessible(): void
    {
        $sitemapResponse = $this->get('/sitemap.xml');
        $sitemapResponse->assertStatus(200);
        $this->assertStringContainsString('https://restrly.com/', $sitemapResponse->getContent());

        $robotsResponse = $this->get('/robots.txt');
        $robotsResponse->assertStatus(200);
        $this->assertStringContainsString('Disallow: /dashboard', $robotsResponse->getContent());
    }
}
