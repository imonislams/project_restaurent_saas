<?php

namespace Tests\Feature\Platform;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\Models\PlatformRefund;
use App\Domain\Billing\PlatformPaymentService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Mail\InvoiceIssuedMail;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PlatformPaymentTest extends TestCase
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

    protected function invoice(): SubscriptionInvoice
    {
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        app(SubscriptionService::class)->activate($subscription);

        return app(SubscriptionService::class)->issueInvoice($subscription->fresh());
    }

    protected function sslcommerzConfig(): PaymentGateway
    {
        return PaymentGateway::create([
            'name' => 'SSLCommerz Sandbox',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'supported_currencies' => ['USD', 'BDT'],
            'credentials' => ['store_id' => 'test_store', 'store_password' => 'secretpass'],
        ]);
    }

    public function test_gateway_configuration_is_stored_encrypted(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/gateways', [
            'name' => 'SSLCommerz Sandbox',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'supported_currencies' => ['USD', 'BDT'],
            'credentials' => ['store_id' => 'abc123', 'store_password' => 'supersecret'],
        ])->assertRedirect();

        $raw = DB::table('payment_gateways')->where('provider', 'sslcommerz')->value('credentials');
        $this->assertStringNotContainsString('supersecret', $raw);

        $config = PaymentGateway::where('provider', 'sslcommerz')->firstOrFail();
        $this->assertSame('abc123', $config->credentials['store_id']);
        $this->assertTrue($config->is_enabled);
    }

    public function test_blank_credential_field_does_not_wipe_the_stored_secret(): void
    {
        $admin = $this->admin();
        $config = $this->sslcommerzConfig();

        $this->actingAs($admin)->patch("/platform/gateways/{$config->id}", [
            'name' => 'SSLCommerz Sandbox',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => false,
            'supported_currencies' => ['USD'],
            'credentials' => ['store_id' => '', 'store_password' => ''],
        ])->assertRedirect();

        $config->refresh();
        $this->assertSame('test_store', $config->credentials['store_id']);
        $this->assertFalse($config->is_enabled);
    }

    public function test_gateway_configuration_test_reports_missing_credentials(): void
    {
        $admin = $this->admin();
        $config = PaymentGateway::create(['name' => 'Incomplete', 'provider' => 'sslcommerz', 'environment' => 'sandbox', 'is_enabled' => true, 'credentials' => ['store_id' => 'x']]);

        $this->actingAs($admin)->post("/platform/gateways/{$config->id}/test")->assertRedirect();
        $this->assertSame('error', $config->fresh()->health_status);
    }

    public function test_checkout_creates_a_pending_payment_and_returns_a_gateway_url(): void
    {
        $admin = $this->admin();
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/xyz'], 200),
        ]);

        $response = $this->actingAs($admin)->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);

        // Inertia::location issues a redirect to the external gateway URL.
        $response->assertRedirect('https://sandbox.sslcommerz.com/pay/xyz');

        $payment = PlatformPayment::firstOrFail();
        $this->assertSame(PlatformPaymentStatus::Pending, $payment->status);
        $this->assertSame('29.00', $payment->amount);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.payment_initiated']);
    }

    public function test_verified_ipn_marks_the_payment_and_invoice_paid(): void
    {
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/xyz'], 200),
        ]);
        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);

        $payment = PlatformPayment::firstOrFail();

        Http::fake([
            'sandbox.sslcommerz.com/validator/api/*' => Http::response([
                'status' => 'VALID',
                'amount' => '29.00',
                'currency' => 'USD',
                'tran_id' => $payment->provider_ref,
            ], 200),
        ]);

        $this->post('/payments/ipn/sslcommerz', [
            'tran_id' => $payment->provider_ref,
            'val_id' => 'VAL-123',
            'status' => 'VALID',
        ])->assertOk()->assertJson(['processed' => true]);

        $this->assertSame(PlatformPaymentStatus::Succeeded, $payment->fresh()->status);
        $this->assertSame('paid', $invoice->fresh()->status->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.payment_succeeded']);
    }

    public function test_amount_mismatch_is_rejected_and_the_payment_fails(): void
    {
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://x/pay'], 200)]);
        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);
        $payment = PlatformPayment::firstOrFail();

        Http::fake([
            'sandbox.sslcommerz.com/validator/api/*' => Http::response([
                'status' => 'VALID',
                'amount' => '9.00',
                'currency' => 'USD',
                'tran_id' => $payment->provider_ref,
            ], 200),
        ]);

        $this->post('/payments/ipn/sslcommerz', [
            'tran_id' => $payment->provider_ref,
            'val_id' => 'VAL-999',
        ])->assertOk();

        $this->assertSame(PlatformPaymentStatus::Failed, $payment->fresh()->status);
        $this->assertNotSame('paid', $invoice->fresh()->status->value);
    }

    public function test_duplicate_ipn_is_processed_only_once(): void
    {
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://x/pay'], 200)]);
        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);
        $payment = PlatformPayment::firstOrFail();

        Http::fake([
            'sandbox.sslcommerz.com/validator/api/*' => Http::response([
                'status' => 'VALID', 'amount' => '29.00', 'currency' => 'USD', 'tran_id' => $payment->provider_ref,
            ], 200),
        ]);

        $payload = ['tran_id' => $payment->provider_ref, 'val_id' => 'VAL-DUP'];

        $this->post('/payments/ipn/sslcommerz', $payload)->assertJson(['processed' => true]);
        $this->post('/payments/ipn/sslcommerz', $payload)->assertJson(['processed' => false, 'duplicate' => true]);

        $this->assertSame(1, PlatformPayment::where('status', PlatformPaymentStatus::Succeeded->value)->count());
        $this->assertDatabaseCount('platform_payment_events', 1);
    }

    public function test_browser_return_reports_success_when_the_ipn_already_settled_the_payment(): void
    {
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://x/pay'], 200)]);
        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);
        $payment = PlatformPayment::firstOrFail();

        Http::fake([
            'sandbox.sslcommerz.com/validator/api/*' => Http::response([
                'status' => 'VALID', 'amount' => '29.00', 'currency' => 'USD', 'tran_id' => $payment->provider_ref,
            ], 200),
        ]);

        $payload = ['tran_id' => $payment->provider_ref, 'val_id' => 'VAL-RETURN', 'status' => 'VALID'];

        // SSLCommerz's server IPN settles the payment first...
        $this->post('/payments/ipn/sslcommerz', $payload)->assertJson(['processed' => true]);
        $this->assertSame(PlatformPaymentStatus::Succeeded, $payment->fresh()->status);

        // ...then the browser return for the same transaction must still report success.
        $this->get('/payments/callback/sslcommerz/success?'.http_build_query($payload))
            ->assertRedirect(route('payments.result', ['status' => 'success']));
    }

    public function test_refund_cannot_exceed_the_refundable_balance(): void
    {
        $admin = $this->admin();
        $payment = PlatformPayment::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'gateway' => 'manual',
            'provider_ref' => 'PAY-1',
            'amount' => 29,
            'currency' => 'USD',
            'status' => PlatformPaymentStatus::Succeeded,
            'paid_at' => now(),
        ]);

        $this->actingAs($admin)->post("/platform/payments/{$payment->id}/refund", [
            'amount' => 100,
            'reason' => 'Over refund',
        ])->assertSessionHasErrors('amount');

        $this->assertDatabaseCount('platform_refunds', 0);
    }

    public function test_manual_refund_updates_payment_state(): void
    {
        $admin = $this->admin();
        $payment = PlatformPayment::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'gateway' => 'manual',
            'provider_ref' => 'PAY-2',
            'amount' => 29,
            'currency' => 'USD',
            'status' => PlatformPaymentStatus::Succeeded,
            'paid_at' => now(),
        ]);

        $this->actingAs($admin)->post("/platform/payments/{$payment->id}/refund", [
            'amount' => 29,
            'reason' => 'Customer request',
        ])->assertRedirect();

        $this->assertDatabaseCount('platform_refunds', 1);
        $this->assertSame(PlatformPaymentStatus::Refunded, $payment->fresh()->status);
        $this->assertSame('29.00', $payment->fresh()->refunded_amount);
    }

    public function test_invoice_email_is_queued_and_marked_sent(): void
    {
        Mail::fake();
        $admin = $this->admin();
        $invoice = $this->invoice();

        $this->actingAs($admin)->post("/platform/invoices/{$invoice->id}/send")->assertRedirect();

        Mail::assertQueued(InvoiceIssuedMail::class);
        $this->assertNotNull($invoice->fresh()->sent_at);
    }

    public function test_invoice_document_downloads_as_pdf(): void
    {
        $admin = $this->admin();
        $invoice = $this->invoice();

        $response = $this->actingAs($admin)->get("/platform/invoices/{$invoice->id}/document");

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $response->headers->get('content-type'));
    }

    public function test_billing_admin_can_view_invoices_but_cannot_configure_gateways(): void
    {
        $billing = User::factory()->platformAdmin()->create();
        $billing->assignRole(RoleName::BillingAdmin);

        $this->actingAs($billing)->get('/platform/invoices')->assertOk();
        $this->actingAs($billing)->get('/platform/gateways')->assertForbidden();

        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::PlatformAuditor);
        $this->actingAs($auditor)->get('/platform/payments')->assertOk();
        $gateway = $this->sslcommerzConfig();
        $this->actingAs($auditor)->post("/platform/gateways/{$gateway->id}/test")->assertForbidden();
    }

    public function test_sslcommerz_verification_calls_the_validator_path_the_provider_serves(): void
    {
        // Regression guard: the "/validatorapi/..." path answers 404, which made
        // every genuinely paid transaction fail verification.
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/xyz'], 200),
            'sandbox.sslcommerz.com/validator/api/*' => Http::response([
                'status' => 'VALID',
                'amount' => '29.00',
                'currency' => 'USD',
                'tran_id' => 'PAY-INV',
            ], 200),
        ]);

        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);
        $payment = PlatformPayment::firstOrFail();

        $this->post('/payments/ipn/sslcommerz', [
            'tran_id' => $payment->provider_ref,
            'val_id' => 'VAL-URL',
        ])->assertJson(['processed' => true]);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/validator/api/validationserverAPI.php'));
        $this->assertSame(PlatformPaymentStatus::Succeeded, $payment->fresh()->status);
    }

    public function test_an_unreachable_validator_leaves_the_payment_pending_instead_of_failing_it(): void
    {
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/xyz'], 200),
            'sandbox.sslcommerz.com/validator/api/*' => Http::response('<html>404 Not Found</html>', 404),
        ]);

        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);
        $payment = PlatformPayment::firstOrFail();

        $this->post('/payments/ipn/sslcommerz', [
            'tran_id' => $payment->provider_ref,
            'val_id' => 'VAL-GONE',
        ])->assertJson(['processed' => false]);

        // A gateway we could not ask says nothing about the payment — it must stay
        // pending (and payable/confirmable by a human), never be marked failed.
        $payment->refresh();
        $this->assertSame(PlatformPaymentStatus::Pending, $payment->status);
        $this->assertNotEmpty($payment->meta['verification_error'] ?? null);
        $this->assertNotSame('paid', $invoice->fresh()->status->value);

        // The customer's return page reports that it is still being confirmed.
        $this->get('/payments/callback/sslcommerz/success?'.http_build_query([
            'tran_id' => $payment->provider_ref,
            'val_id' => 'VAL-GONE',
        ]))->assertRedirect(route('payments.result', ['status' => 'pending']));
    }

    public function test_a_usd_payment_verified_in_bdt_settles_without_a_false_mismatch(): void
    {
        // SSLCommerz settles in BDT and reports the original figures separately:
        // comparing the converted ones would fail a payment that really succeeded.
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/xyz'], 200),
            'sandbox.sslcommerz.com/validator/api/*' => Http::response([
                'status' => 'VALIDATED',
                'amount' => '3540.00',
                'currency' => 'BDT',
                'currency_amount' => '29.00',
                'currency_type' => 'USD',
                'tran_id' => 'PAY-INV',
            ], 200),
        ]);

        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);
        $payment = PlatformPayment::firstOrFail();

        $this->post('/payments/ipn/sslcommerz', [
            'tran_id' => $payment->provider_ref,
            'val_id' => 'VAL-BDT',
        ])->assertJson(['processed' => true]);

        $this->assertSame(PlatformPaymentStatus::Succeeded, $payment->fresh()->status);
        $this->assertSame('paid', $invoice->fresh()->status->value);
    }

    public function test_a_rejected_checkout_records_the_providers_own_reason(): void
    {
        $config = $this->sslcommerzConfig();
        $invoice = $this->invoice();

        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/*' => Http::response([
                'status' => 'FAILED',
                'failedreason' => 'Mandatory field missing: cus_phone',
            ], 200),
        ]);

        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id])
            ->assertRedirect()
            ->assertSessionHas('error', fn (string $message) => str_contains($message, 'cus_phone'));

        $payment = PlatformPayment::firstOrFail();
        $this->assertSame(PlatformPaymentStatus::Failed, $payment->status);
        $this->assertSame('Mandatory field missing: cus_phone', $payment->failure_reason);
    }
}
