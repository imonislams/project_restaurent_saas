<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function tenantWithOwner(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($tenant);

        return [$tenant, $owner];
    }

    public function test_registration_starts_a_trial_subscription(): void
    {
        $this->post('/register', [
            'identifier_type' => 'email',
            'name' => 'Owner',
            'restaurant_name' => 'Spice House',
            'email' => 'new@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect();

        $subscription = Subscription::withoutGlobalScopes()->firstOrFail();
        $this->assertSame(SubscriptionStatus::Trialing, $subscription->status);
        $this->assertSame('starter', $subscription->plan->slug);
        $this->assertTrue($subscription->trial_ends_at->isFuture());
    }

    public function test_plan_can_be_changed_with_a_billing_cycle(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($owner)->post("/platform/subscriptions/{$subscription->id}/plan", [
            'plan_id' => $growth->id,
            'billing_cycle' => 'yearly',
        ])->assertForbidden(); // tenant owners cannot reach the platform workspace

        app(SubscriptionService::class)->changePlan($subscription, $growth, BillingCycle::Yearly, $owner);

        $subscription->refresh();
        $this->assertSame($growth->id, $subscription->plan_id);
        $this->assertSame(BillingCycle::Yearly, $subscription->billing_cycle);
    }

    public function test_suspending_a_subscription_closes_the_workspace_but_keeps_the_subscription_page(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);

        app(SubscriptionService::class)->suspend($subscription, $owner);

        $this->assertSame(SubscriptionStatus::Suspended, $subscription->fresh()->status);

        // Suspension is a billing state, not an account suspension: the tenant stays
        // signed in and lands on the one page where they can pay.
        $this->assertSame('active', $tenant->fresh()->status->value);
        $this->actingAs($owner)->get('/dashboard')->assertRedirect(route('subscription.index'));
        $this->assertAuthenticatedAs($owner);
    }

    public function test_reactivating_restores_the_tenant(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        app(SubscriptionService::class)->suspend($subscription, $owner);

        app(SubscriptionService::class)->activate($subscription, $owner);

        $this->assertSame(SubscriptionStatus::Active, $subscription->fresh()->status);
        $this->assertSame('active', $tenant->fresh()->status->value);
    }

    public function test_renewal_issues_and_pays_an_invoice(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        app(SubscriptionService::class)->activate($subscription, $owner);

        app(SubscriptionService::class)->renew($subscription->fresh(), $owner);

        $invoice = $subscription->invoices()->firstOrFail();
        $this->assertSame('paid', $invoice->status->value);
        $this->assertSame('29.00', $invoice->amount);
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.renewed']);
    }

    public function test_entitlements_reflect_the_plan(): void
    {
        [$tenant] = $this->tenantWithOwner();
        $starter = Plan::where('slug', 'starter')->firstOrFail();
        app(SubscriptionService::class)->startTrial($tenant, $starter);

        $tenant->refresh();
        $this->assertTrue($tenant->hasFeature('pos'));
        $this->assertTrue($tenant->hasFeature('kitchen'));
        $this->assertFalse($tenant->hasFeature('purchasing'));
        $this->assertSame(1, $tenant->planLimit('branches'));
    }

    public function test_plan_feature_gating_blocks_a_disabled_module(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $starter = Plan::where('slug', 'starter')->firstOrFail(); // no 'purchasing' feature
        app(SubscriptionService::class)->startTrial($tenant, $starter);

        $this->actingAs($owner)->get('/kitchen')->assertOk();       // kitchen is enabled
        $this->actingAs($owner)->get('/purchasing/orders')->assertForbidden();
    }

    public function test_user_limit_is_enforced_on_invitations(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $limited = Plan::create([
            'name' => 'Tiny', 'slug' => 'tiny', 'price_monthly' => 0, 'price_yearly' => 0,
            'trial_days' => 7, 'features' => ['pos'], 'limits' => ['users' => 1], 'is_active' => true,
        ]);
        app(SubscriptionService::class)->startTrial($tenant, $limited);

        // Owner already counts as 1 user.
        $this->actingAs($owner)->post('/staff', [
            'email' => 'newhire@example.com',
            'roles' => [RoleName::Cashier->value],
        ])->assertSessionHasErrors('users');

        $this->assertSame(0, Invitation::count());
    }

    public function test_usage_metrics_are_computed(): void
    {
        [$tenant] = $this->tenantWithOwner();

        $metrics = app(UsageService::class)->metrics($tenant);

        $this->assertSame(1, $metrics['users']);
        $this->assertSame(0, $metrics['branches']);
        $this->assertArrayHasKey('orders_this_month', $metrics);
    }
}
