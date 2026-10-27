<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Coupon;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\PricingService;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PlatformBillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_plan_can_be_created_with_multi_currency_prices(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/plans', [
            'name' => 'Pro',
            'slug' => 'pro',
            'currency' => 'USD',
            'price_monthly' => 19,
            'price_yearly' => 190,
            'trial_days' => 14,
            'visibility' => 'public',
            'features' => ['pos'],
            'limits' => ['users' => 3],
            'prices' => [
                ['currency' => 'USD', 'interval' => 'monthly', 'price' => 19],
                ['currency' => 'BDT', 'interval' => 'monthly', 'price' => 1500],
            ],
        ])->assertRedirect();

        $plan = Plan::where('slug', 'pro')->firstOrFail();
        $this->assertSame(1, $plan->version);
        $this->assertDatabaseHas('plan_prices', ['plan_id' => $plan->id, 'currency' => 'BDT', 'interval' => 'monthly']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.plan_created']);
    }

    public function test_multi_currency_price_resolution(): void
    {
        $plan = Plan::where('slug', 'starter')->firstOrFail();
        $plan->prices()->create(['currency' => 'BDT', 'interval' => 'monthly', 'price' => 3000]);

        $pricing = app(PricingService::class);

        $this->assertSame(3000.0, $pricing->priceFor($plan, 'BDT', BillingCycle::Monthly));
        $this->assertSame(29.0, $pricing->priceFor($plan, 'USD', BillingCycle::Monthly));
        $this->assertNull($pricing->priceFor($plan, 'EUR', BillingCycle::Monthly));
    }

    public function test_editing_a_plan_bumps_version_but_preserves_subscription_snapshot(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $subscription = app(SubscriptionService::class)->startTrial($tenant, $plan);
        $snapshotPrice = $subscription->fresh()->plan_snapshot['price_monthly'];
        $this->assertSame(29.0, (float) $snapshotPrice);

        $this->actingAs($admin)->patch("/platform/plans/{$plan->id}", [
            'name' => 'Starter',
            'slug' => 'starter',
            'currency' => 'USD',
            'price_monthly' => 39,
            'price_yearly' => 390,
            'trial_days' => 14,
            'visibility' => 'public',
        ])->assertRedirect();

        $this->assertSame(2, $plan->fresh()->version);

        // The existing subscription keeps the terms captured at sign-up.
        $subscription->refresh();
        $this->assertSame(29.0, (float) $subscription->plan_snapshot['price_monthly']);
        $this->assertSame(1, $subscription->plan_version);
    }

    public function test_a_plan_with_subscriptions_cannot_be_deleted_but_can_be_archived(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $plan = Plan::where('slug', 'starter')->firstOrFail();
        app(SubscriptionService::class)->startTrial($tenant, $plan);

        $this->actingAs($admin)->delete("/platform/plans/{$plan->id}")->assertSessionHasErrors('plan');
        $this->assertNull($plan->fresh()->deleted_at);

        $this->actingAs($admin)->post("/platform/plans/{$plan->id}/archive")->assertRedirect();
        $this->assertNotNull($plan->fresh()->archived_at);
        $this->assertFalse($plan->fresh()->isSelectable());
    }

    public function test_coupon_discount_is_applied_to_the_subscription_invoice(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);

        Coupon::create(['code' => 'SAVE10', 'type' => 'percent', 'value' => 10, 'is_active' => true]);

        app(SubscriptionService::class)->applyCoupon($subscription, 'save10', $admin);

        $invoice = app(SubscriptionService::class)->issueInvoice($subscription->fresh());

        $this->assertSame('2.90', $invoice->discount_amount);
        $this->assertSame('26.10', $invoice->amount);
        $this->assertSame('SAVE10', $invoice->coupon_code);
        $this->assertSame(1, Coupon::where('code', 'SAVE10')->first()->redeemed_count);
    }

    public function test_a_coupon_cannot_be_redeemed_twice_by_the_same_tenant(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        Coupon::create(['code' => 'ONCE', 'type' => 'percent', 'value' => 10, 'is_active' => true]);

        app(SubscriptionService::class)->applyCoupon($subscription, 'ONCE', $admin);

        $this->expectException(ValidationException::class);
        app(SubscriptionService::class)->applyCoupon($subscription, 'ONCE', $admin);
    }

    public function test_subscriptions_index_renders_and_filters(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        app(SubscriptionService::class)->startTrial($tenant);

        $this->actingAs($admin)->get('/platform/subscriptions')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Subscriptions/Index')->has('subscriptions.data', 1));

        $this->actingAs($admin)->get('/platform/subscriptions/trials')->assertOk()
            ->assertInertia(fn ($page) => $page->where('filters.status', 'trialing'));
    }

    public function test_coupons_and_usage_pages_render(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform/coupons')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Coupons'));

        $this->actingAs($admin)->get('/platform/usage')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Usage')->has('tenants.data'));
    }

    public function test_scheduled_cancellation_expires_after_the_period(): void
    {
        $tenant = Tenant::factory()->withoutSubscription()->create();
        $plan = Plan::where('slug', 'starter')->firstOrFail();

        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'current_period_end' => now()->subDay(),
            'cancel_at_period_end' => true,
        ]);

        $this->artisan('subscriptions:process')->assertSuccessful();

        $subscription = Subscription::withoutGlobalScopes()->firstOrFail();
        $this->assertSame('expired', $subscription->status->value);
        // Expiry is a billing state: the account stays active and the subscription
        // gate closes the workspace, keeping the Subscription page reachable.
        $this->assertSame('active', $tenant->fresh()->status->value);
    }
}
