<?php

namespace Tests\Feature\Subscription;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Enums\CouponType;
use App\Domain\Subscriptions\Enums\PlanRegion;
use App\Domain\Subscriptions\Models\Coupon;
use App\Domain\Subscriptions\Models\CouponRedemption;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TenantSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    /** @return array{0: Tenant, 1: User} */
    protected function tenantWithOwner(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($tenant);
        app(SubscriptionService::class)->startTrial($tenant);
        app(TenantContext::class)->forget();

        return [$tenant, $owner];
    }

    public function test_subscription_page_renders_for_the_owner(): void
    {
        [, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->get('/subscription')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Subscription/Index')->has('plans'));
    }

    public function test_changing_plan_is_pending_and_does_not_activate_before_payment(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $current = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail()->plan;
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($owner)->post('/subscription/plan', [
            'plan_id' => $growth->getKey(),
            'billing_cycle' => 'yearly',
        ])->assertRedirect();

        // The live plan is untouched; the change is held as pending.
        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame($current->getKey(), $subscription->plan_id);
        $this->assertSame($growth->getKey(), $subscription->pending_plan_id);
        $this->assertSame('yearly', $subscription->pending_billing_cycle->value);
        $this->assertNotNull($subscription->pending_invoice_id);

        // The tenant keeps the current plan's entitlements while pending.
        $this->assertSame(5, $tenant->fresh()->planLimit('users'));

        // The invoice bills the target plan at its price.
        $this->assertDatabaseHas('subscription_invoices', [
            'tenant_id' => $tenant->id,
            'plan_id' => $growth->getKey(),
            'amount' => 790,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.plan_change_requested']);
    }

    public function test_settling_the_pending_invoice_activates_the_new_plan(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($owner)->post('/subscription/plan', [
            'plan_id' => $growth->getKey(),
            'billing_cycle' => 'monthly',
        ])->assertRedirect();

        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);

        app(TenantContext::class)->set($tenant);
        app(SubscriptionService::class)->payInvoice($invoice, $owner);
        app(TenantContext::class)->forget();

        $subscription->refresh();
        $this->assertSame($growth->getKey(), $subscription->plan_id);
        $this->assertSame('monthly', $subscription->billing_cycle->value);
        $this->assertNull($subscription->pending_plan_id);
        $this->assertNull($subscription->pending_invoice_id);
        $this->assertSame('active', $subscription->status->value);
        $this->assertSame(25, $tenant->fresh()->planLimit('users'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.plan_changed']);
    }

    public function test_a_free_plan_change_activates_immediately_without_a_checkout(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $free = Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'currency' => 'USD',
            'price_monthly' => 0,
            'price_yearly' => 0,
            'trial_days' => 0,
            'is_active' => true,
            'visibility' => 'public',
            'region' => PlanRegion::Global,
            'sort_order' => 9,
        ]);

        $this->actingAs($owner)->post('/subscription/plan', [
            'plan_id' => $free->getKey(),
            'billing_cycle' => 'monthly',
        ])->assertRedirect();

        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame($free->getKey(), $subscription->plan_id);
        $this->assertNull($subscription->pending_plan_id);
    }

    public function test_cashier_cannot_change_the_plan(): void
    {
        [$tenant] = $this->tenantWithOwner();
        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($cashier)->post('/subscription/plan', [
            'plan_id' => $growth->getKey(),
            'billing_cycle' => 'monthly',
        ])->assertForbidden();
    }

    public function test_tenant_can_pay_an_open_invoice_via_the_gateway(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $config = PaymentGateway::create([
            'name' => 'SSLCommerz Sandbox',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'supported_currencies' => ['USD'],
            'credentials' => ['store_id' => 'a', 'store_password' => 'b'],
        ]);

        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        app(TenantContext::class)->set($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);
        app(TenantContext::class)->forget();

        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/abc'], 200)]);

        $this->actingAs($owner)->post("/subscription/invoices/{$invoice->id}/pay", ['gateway_id' => $config->id])
            ->assertRedirect('https://sandbox.sslcommerz.com/pay/abc');

        $this->assertDatabaseCount('platform_payments', 1);
        $this->assertSame('pending', PlatformPayment::firstOrFail()->status->value);
    }

    public function test_tenant_cannot_pay_another_tenants_invoice(): void
    {
        [, $owner] = $this->tenantWithOwner();
        [$otherTenant] = $this->tenantWithOwner();
        $otherSubscription = Subscription::withoutGlobalScopes()->where('tenant_id', $otherTenant->id)->firstOrFail();

        app(TenantContext::class)->set($otherTenant);
        $otherInvoice = app(SubscriptionService::class)->issueInvoice($otherSubscription);
        app(TenantContext::class)->forget();

        $config = PaymentGateway::create(['name' => 'Manual', 'provider' => 'manual', 'environment' => 'production', 'is_enabled' => true, 'supported_currencies' => []]);

        $this->actingAs($owner)->post("/subscription/invoices/{$otherInvoice->id}/pay", ['gateway_id' => $config->id])
            ->assertNotFound();
    }

    public function test_the_tenant_can_download_an_invoice_pdf(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        app(TenantContext::class)->set($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);
        app(TenantContext::class)->forget();

        // A paid invoice used to 500 here: the view cast the paid_at Carbon to float.
        $invoice->forceFill(['paid_at' => now()])->save();

        $this->actingAs($owner)->get("/subscription/invoices/{$invoice->id}/document")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    /** @return array{0: Tenant, 1: User, 2: Subscription} */
    protected function pendingPlanChange(): array
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($owner)->post('/subscription/plan', [
            'plan_id' => $growth->getKey(),
            'billing_cycle' => 'monthly',
        ])->assertRedirect();

        return [$tenant, $owner, Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail()];
    }

    protected function coupon(array $attributes = []): Coupon
    {
        return Coupon::create(array_merge([
            'code' => 'SAVE20',
            'type' => CouponType::Percent,
            'value' => 20,
            'currency' => 'USD',
            'is_active' => true,
        ], $attributes));
    }

    public function test_a_valid_coupon_discounts_the_invoice_before_payment(): void
    {
        [, $owner, $subscription] = $this->pendingPlanChange();
        $this->coupon();

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);
        $subtotal = (float) $invoice->subtotal;

        // Lower-case input is accepted; codes are stored upper-case.
        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'save20'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $invoice->refresh();

        $this->assertSame('SAVE20', $invoice->coupon_code);
        $this->assertSame(round($subtotal * 0.2, 2), (float) $invoice->discount_amount);
        $this->assertSame(round($subtotal * 0.8, 2), (float) $invoice->amount);
        // The amount the tenant is asked to pay matches the discounted total.
        $this->assertSame(round($subtotal * 0.8, 2), $invoice->outstandingAmount());
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.coupon_applied']);
        // Applying is not a redemption — that happens when the invoice settles.
        $this->assertSame(0, CouponRedemption::query()->count());
    }

    public function test_expired_and_not_yet_valid_coupons_are_rejected(): void
    {
        [, $owner, $subscription] = $this->pendingPlanChange();
        $this->coupon(['code' => 'OLD', 'valid_to' => now()->subDay()]);
        $this->coupon(['code' => 'SOON', 'valid_from' => now()->addDay()]);

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'OLD'])
            ->assertSessionHasErrors('code');
        $this->assertStringContainsString('expired', session('errors')->first('code'));

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'SOON'])
            ->assertSessionHasErrors('code');

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);
        $this->assertNull($invoice->coupon_code);
        $this->assertSame(0.0, (float) $invoice->discount_amount);
    }

    public function test_total_and_per_tenant_usage_limits_are_enforced(): void
    {
        [$tenant, $owner] = $this->pendingPlanChange();
        $this->coupon(['code' => 'EXHAUSTED', 'max_redemptions' => 1, 'redeemed_count' => 1]);
        $used = $this->coupon(['code' => 'ONCE']);
        $used->redemptions()->create(['tenant_id' => $tenant->id, 'amount' => 10, 'redeemed_at' => now()]);

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'EXHAUSTED'])
            ->assertSessionHasErrors('code');
        $this->assertStringContainsString('usage limit', session('errors')->first('code'));

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'ONCE'])
            ->assertSessionHasErrors('code');
        $this->assertStringContainsString('already used', session('errors')->first('code'));
    }

    public function test_plan_eligibility_minimum_amount_and_unknown_codes_are_enforced(): void
    {
        [, $owner, $subscription] = $this->pendingPlanChange();
        $starter = Plan::where('slug', 'starter')->firstOrFail();
        $this->coupon(['code' => 'STARTERONLY', 'applies_to_plan_id' => $starter->getKey()]);
        $this->coupon(['code' => 'BIGMIN', 'min_amount' => 100000]);
        $this->coupon(['code' => 'OFF', 'is_active' => false]);

        // The pending change bills Growth — a Starter-only coupon does not apply.
        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'STARTERONLY'])
            ->assertSessionHasErrors('code');
        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'BIGMIN'])
            ->assertSessionHasErrors('code');
        $this->assertStringContainsString('minimum invoice', session('errors')->first('code'));
        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'OFF'])
            ->assertSessionHasErrors('code');
        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'NOPE'])
            ->assertSessionHasErrors('code');
        $this->assertStringContainsString('could not find', session('errors')->first('code'));

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);
        $this->assertNull($invoice->coupon_code);
    }

    public function test_a_fixed_coupon_can_cover_the_invoice_and_activate_the_plan(): void
    {
        [$tenant, $owner, $subscription] = $this->pendingPlanChange();
        $this->coupon(['code' => 'FULL', 'type' => CouponType::Fixed, 'value' => 100000]);

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'FULL'])->assertRedirect();

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);

        // The discount is clamped to the subtotal — never a negative invoice.
        $this->assertSame(0.0, (float) $invoice->amount);
        $this->assertSame('paid', $invoice->status->value);

        $fresh = Subscription::withoutGlobalScopes()->findOrFail($subscription->id);
        $this->assertNull($fresh->pending_plan_id);
        $this->assertSame('active', $fresh->status->value);

        // Settling the invoice is what records the redemption.
        $this->assertSame(1, CouponRedemption::query()->count());
        $this->assertSame(1, Coupon::where('code', 'FULL')->firstOrFail()->redeemed_count);
    }

    public function test_a_redemption_is_recorded_when_the_invoice_is_paid(): void
    {
        [$tenant, $owner, $subscription] = $this->pendingPlanChange();
        $coupon = $this->coupon();

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'SAVE20'])->assertRedirect();
        $this->assertSame(0, CouponRedemption::query()->count());

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);

        app(TenantContext::class)->set($tenant);
        app(SubscriptionService::class)->payInvoice($invoice->fresh(), $owner);
        app(TenantContext::class)->forget();

        $this->assertSame(1, CouponRedemption::query()->where('coupon_id', $coupon->id)->count());
        $this->assertSame(1, $coupon->fresh()->redeemed_count);
    }

    public function test_a_code_sent_with_the_plan_change_discounts_that_invoice(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $this->coupon();
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($owner)->post('/subscription/plan', [
            'plan_id' => $growth->getKey(),
            'billing_cycle' => 'monthly',
            'coupon_code' => 'SAVE20',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $invoice = SubscriptionInvoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertSame('SAVE20', $invoice->coupon_code);
        $this->assertSame(round((float) $invoice->subtotal * 0.8, 2), (float) $invoice->amount);
    }

    public function test_removing_a_coupon_restores_the_full_price(): void
    {
        [, $owner, $subscription] = $this->pendingPlanChange();
        $this->coupon();

        $this->actingAs($owner)->post('/subscription/coupon', ['code' => 'SAVE20'])->assertRedirect();
        $this->actingAs($owner)->delete('/subscription/coupon')->assertRedirect();

        $invoice = SubscriptionInvoice::withoutGlobalScopes()->findOrFail($subscription->pending_invoice_id);

        $this->assertNull($invoice->coupon_code);
        $this->assertSame(0.0, (float) $invoice->discount_amount);
        $this->assertSame((float) $invoice->subtotal, (float) $invoice->amount);
        $this->assertNull($subscription->fresh()->coupon_id);
    }

    public function test_a_manual_payment_keeps_the_reference_and_asks_for_confirmation(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $config = PaymentGateway::create([
            'name' => 'Manual',
            'provider' => 'manual',
            'environment' => 'production',
            'is_enabled' => true,
            'supported_currencies' => [],
        ]);

        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        app(TenantContext::class)->set($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);
        app(TenantContext::class)->forget();

        $this->actingAs($owner)->post("/subscription/invoices/{$invoice->id}/pay", [
            'gateway_id' => $config->id,
            'reference' => 'bKash TRX 8H2K91',
        ])->assertRedirect()
            ->assertSessionHas('success', fn (string $message) => str_contains($message, 'waiting for confirmation'));

        $payment = PlatformPayment::firstOrFail();

        $this->assertSame('pending', $payment->status->value);
        $this->assertSame('bKash TRX 8H2K91', $payment->meta['tenant_reference']);

        // The tenant is told an administrator will confirm it, not just "pending".
        $this->actingAs($owner)->get('/subscription')->assertOk()
            ->assertInertia(fn ($page) => $page->where('payments.0.status_label', 'Awaiting confirmation'));
    }
}
