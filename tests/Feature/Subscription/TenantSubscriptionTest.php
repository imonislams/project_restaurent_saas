<?php

namespace Tests\Feature\Subscription;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
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

    public function test_tenant_can_change_plan_and_an_invoice_is_issued(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        $this->actingAs($owner)->post('/subscription/plan', [
            'plan_id' => $growth->getKey(),
            'billing_cycle' => 'yearly',
        ])->assertRedirect();

        $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame($growth->getKey(), $subscription->plan_id);
        $this->assertSame('yearly', $subscription->billing_cycle->value);

        $this->assertDatabaseHas('subscription_invoices', ['tenant_id' => $tenant->id, 'amount' => 790]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'subscription.plan_changed']);
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
}
