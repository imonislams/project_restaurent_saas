<?php

namespace Tests\Feature\Platform;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformSettingsTest extends TestCase
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

    public function test_settings_page_renders_with_schema_and_values(): void
    {
        $this->actingAs($this->admin())->get('/platform/settings/general')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Settings/Show')
                ->where('group', 'general')
                ->has('schema.fields')
                ->has('values'));
    }

    public function test_settings_update_persists_and_is_audited(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/settings/general', [
            'values' => ['platform_name' => 'Acme POS', 'support_email' => 'help@acme.test'],
        ])->assertRedirect();

        $this->assertSame('Acme POS', app(PlatformSettings::class)->get('general.platform_name'));

        $log = AuditLog::where('action', 'platform.settings_updated')->latest('id')->firstOrFail();
        $this->assertSame('general', $log->metadata['after']['group']);
        $this->assertSame('Acme POS', $log->metadata['after']['values']['platform_name']);
    }

    public function test_invalid_setting_values_are_rejected(): void
    {
        $this->actingAs($this->admin())->post('/platform/settings/general', [
            'values' => ['support_email' => 'not-an-email'],
        ])->assertSessionHasErrors('values.support_email');
    }

    public function test_impersonation_feature_flag_blocks_impersonation(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        app(PlatformSettings::class)->set('features.impersonation', false, 'features');

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/impersonate", ['reason' => 'Support'])
            ->assertStatus(403);
    }

    public function test_gateway_checkout_feature_flag_blocks_checkout(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);

        app(PlatformSettings::class)->set('features.gateway_checkout', false, 'features');

        $this->actingAs($admin)->post("/platform/invoices/{$invoice->id}/checkout", ['gateway' => 'manual'])
            ->assertStatus(403);
    }

    public function test_billing_settings_drive_invoice_prefix(): void
    {
        app(PlatformSettings::class)->set('billing.invoice_prefix', 'ACME', 'billing');

        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);

        $this->assertStringStartsWith('ACME-', $invoice->number);
    }

    public function test_settings_permissions_are_enforced(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();
        $platformAdmin->assignRole(RoleName::PlatformAdmin);

        // Can view (settings.view) but not change (settings.manage).
        $this->actingAs($platformAdmin)->get('/platform/settings/general')->assertOk();
        $this->actingAs($platformAdmin)->post('/platform/settings/general', ['values' => ['platform_name' => 'X']])->assertForbidden();

        $billing = User::factory()->platformAdmin()->create();
        $billing->assignRole(RoleName::BillingAdmin);
        $this->actingAs($billing)->get('/platform/settings/general')->assertForbidden();
    }

    public function test_branding_logo_is_uploaded_and_colour_validated(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $admin = $this->admin();
        $values = ['brand_color' => '#EC3013', 'tagline' => '', 'logo_url' => 'pending', 'support_url' => ''];

        $this->actingAs($admin)->post('/platform/settings/branding', [
            'values' => $values,
            'files' => ['logo_url' => \Illuminate\Http\UploadedFile::fake()->image('logo.png', 100, 100)],
        ])->assertSessionHasNoErrors();

        $logo = app(PlatformSettings::class)->get('branding.logo_url');
        $this->assertStringContainsString('/storage/branding/', (string) $logo);

        $this->actingAs($admin)->post('/platform/settings/branding', [
            'values' => [...$values, 'brand_color' => 'red', 'logo_url' => $logo],
        ])->assertSessionHasErrors('values.brand_color');
    }

    public function test_social_links_are_saved_and_shared_with_the_website(): void
    {
        $this->actingAs($this->admin())->post('/platform/settings/social', [
            'values' => ['facebook' => 'https://facebook.com/touchdine', 'instagram' => '', 'x' => '', 'linkedin' => '', 'youtube' => '', 'tiktok' => '', 'whatsapp' => ''],
        ])->assertSessionHasNoErrors();

        $this->post('/platform/settings/social', [
            'values' => ['facebook' => 'javascript:alert(1)'],
        ])->assertSessionHasErrors('values.facebook');

        auth()->logout();

        $this->get('/')->assertInertia(fn ($page) => $page->where('social_links', ['facebook' => 'https://facebook.com/touchdine']));
    }
}
