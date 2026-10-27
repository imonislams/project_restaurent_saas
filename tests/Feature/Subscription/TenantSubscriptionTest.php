<?php

namespace Tests\Feature\Subscription;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Enums\PlanRegion;
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
