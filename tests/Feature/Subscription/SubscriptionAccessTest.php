<?php

namespace Tests\Feature\Subscription;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionAccessTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);

        $this->tenant = Tenant::factory()->withoutSubscription()->create();
        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function subscription(SubscriptionStatus $status): Subscription
    {
        $plan = Plan::query()->where('is_active', true)->whereNull('archived_at')->orderBy('sort_order')->firstOrFail();

        return Subscription::create([
            'tenant_id' => $this->tenant->getKey(),
            'plan_id' => $plan->getKey(),
            'status' => $status,
            'billing_cycle' => 'monthly',
            'current_period_start' => now()->subMonth(),
            'current_period_end' => now()->addMonth(),
        ]);
    }

    public function test_a_tenant_without_a_plan_is_kept_on_the_subscription_page(): void
    {
        $this->actingAs($this->owner)->get('/dashboard')->assertRedirect(route('subscription.index'));
        $this->assertAuthenticatedAs($this->owner);

        $this->actingAs($this->owner)->get('/subscription')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Subscription/Index')
                ->where('access_granted', false));

        // A feature route is closed too.
        $this->actingAs($this->owner)->get('/orders')->assertRedirect(route('subscription.index'));
    }

    public function test_an_expired_subscription_closes_the_workspace_but_stays_reachable(): void
    {
        $this->subscription(SubscriptionStatus::Expired);

        $this->actingAs($this->owner)->get('/orders')->assertRedirect(route('subscription.index'));
        $this->assertAuthenticatedAs($this->owner);

        $this->actingAs($this->owner)->get('/subscription')->assertOk()
            ->assertInertia(fn ($page) => $page->where('access_granted', false));
    }

    public function test_the_dunning_window_keeps_full_access(): void
    {
        $subscription = $this->subscription(SubscriptionStatus::PastDue);

        $this->actingAs($this->owner)->get('/dashboard')->assertOk();

        $subscription->forceFill(['status' => SubscriptionStatus::GracePeriod])->save();
        $this->actingAs($this->owner)->get('/dashboard')->assertOk();

        $subscription->forceFill(['status' => SubscriptionStatus::Suspended])->save();
        $this->actingAs($this->owner)->get('/dashboard')->assertRedirect(route('subscription.index'));
    }

    public function test_paying_the_outstanding_invoice_restores_access(): void
    {
        $subscription = $this->subscription(SubscriptionStatus::Suspended);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);

        $this->actingAs($this->owner)->get('/dashboard')->assertRedirect(route('subscription.index'));

        app(SubscriptionService::class)->payInvoice($invoice, $this->owner);

        $subscription->refresh();

        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertSame($invoice->fresh()->period_end?->toDateString(), $subscription->current_period_end?->toDateString());
        $this->actingAs($this->owner)->get('/dashboard')->assertOk();
    }

    public function test_without_a_plan_no_feature_is_enabled(): void
    {
        $this->assertFalse($this->tenant->hasFeature('pos'));
        $this->assertFalse($this->tenant->hasFeature('kitchen'));
        $this->assertFalse($this->tenant->subscriptionAccess());

        $this->subscription(SubscriptionStatus::Active);

        $this->assertTrue($this->tenant->fresh()->hasFeature('pos'));
        $this->assertTrue($this->tenant->fresh()->subscriptionAccess());
    }

    public function test_the_qr_menu_is_closed_while_the_plan_is_not_active(): void
    {
        $branch = Branch::factory()->create(['tenant_id' => $this->tenant->getKey(), 'code' => 'MAIN']);
        $table = Table::factory()->create(['tenant_id' => $this->tenant->getKey(), 'branch_id' => $branch->getKey()]);
        $token = app(TableQrService::class)->ensureToken($table)->token;

        $this->get(route('qr.status', ['token' => $token]))->assertNotFound();

        $this->subscription(SubscriptionStatus::Active);

        // No 404: the QR context resolves; the status endpoint then reports that
        // there is no active dining session yet.
        $this->get(route('qr.status', ['token' => $token]))->assertStatus(409);
    }

    public function test_a_tenant_with_no_subscription_can_start_one_and_gets_access_only_after_paying(): void
    {
        $plan = Plan::query()->where('is_active', true)->whereNull('archived_at')->orderBy('sort_order')->firstOrFail();

        $invoice = app(SubscriptionService::class)->startSubscription($this->tenant, $plan, BillingCycle::Monthly, $this->owner);

        $subscription = $this->tenant->fresh()->subscription;

        $this->assertNotNull($subscription);
        $this->assertSame($plan->getKey(), $subscription->plan_id);
        $this->assertSame($invoice->getKey(), $subscription->pending_invoice_id);
        $this->assertFalse($this->tenant->fresh()->subscriptionAccess());

        app(SubscriptionService::class)->payInvoice($invoice, $this->owner);

        $this->assertTrue($this->tenant->fresh()->subscriptionAccess());
        $this->assertSame(SubscriptionStatus::Active, $subscription->fresh()->status);
    }
}
