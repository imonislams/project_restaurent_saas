<?php

namespace Tests\Feature\Tenant;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    /** @return array{0: Tenant, 1: User} */
    protected function tenantWithOwner(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        return [$tenant, $owner];
    }

    public function test_settings_hub_renders_for_the_owner(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->get('/settings')->assertRedirect('/settings/company');

        $this->actingAs($owner)->get('/settings/company')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Settings/Show')->where('group', 'company'));

        $this->actingAs($owner)->get('/settings/pos')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Settings/Show')->where('group', 'pos'));

        $this->actingAs($owner)->get('/settings/branches')->assertOk();
    }

    public function test_cashier_cannot_reach_settings(): void
    {
        [$tenant] = $this->tenantWithOwner();

        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/settings/company')->assertForbidden();
        $this->actingAs($cashier)->post('/settings/company', ['legal_name' => 'X', 'country' => 'BD', 'currency' => 'BDT', 'timezone' => 'Asia/Dhaka'])->assertForbidden();
    }

    public function test_company_settings_update_persists_and_is_audited(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/settings/company', [
            'legal_name' => 'Acme Ltd',
            'phone' => '01700000000',
            'email' => 'billing@acme.test',
            'tax_id' => 'VAT-1',
            'address' => '1 Main St',
            'country' => 'BD',
            'currency' => 'BDT',
            'timezone' => 'Asia/Dhaka',
        ])->assertRedirect();

        $tenant->refresh();
        $this->assertSame('Acme Ltd', $tenant->getSetting('company.legal_name'));
        $this->assertSame('BDT', $tenant->getSetting('region.currency'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.company_updated']);
    }

    public function test_tax_and_receipt_settings_persist(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/settings/tax', ['tax_name' => 'VAT', 'tax_rate' => 15, 'tax_inclusive' => false])->assertRedirect();
        $this->actingAs($owner)->post('/settings/receipt', ['receipt_header' => 'Acme', 'receipt_footer' => 'Thanks', 'receipt_show_tax' => true, 'receipt_show_logo' => false])->assertRedirect();

        $tenant->refresh();
        $this->assertSame(15.0, (float) $tenant->getSetting('tax.rate'));
        $this->assertSame('VAT', $tenant->getSetting('tax.name'));
        $this->assertSame('Thanks', $tenant->getSetting('receipt.footer'));
    }

    public function test_pos_and_notification_settings_persist(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/settings/pos', [
            'service_charge_rate' => 5,
            'pos_allow_partial' => true,
            'payments_provider' => 'sslcommerz',
        ])->assertRedirect();

        $this->actingAs($owner)->post('/settings/notifications', [
            'low_stock_threshold' => 3,
            'loyalty_enabled' => true,
            'loyalty_points_per_currency' => 2,
        ])->assertRedirect();

        $tenant->refresh();
        $this->assertSame(5.0, (float) $tenant->getSetting('service_charge.rate'));
        $this->assertTrue((bool) $tenant->getSetting('pos.allow_partial'));
        $this->assertSame('sslcommerz', $tenant->getSetting('payments.provider'));
        $this->assertTrue((bool) $tenant->getSetting('loyalty.enabled'));
        $this->assertSame(3.0, (float) $tenant->getSetting('inventory.low_stock_threshold'));
    }

    public function test_team_settings_render_and_persist(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->get('/settings/team')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Settings/Show')
                ->where('group', 'team')
                ->where('form.invitation_verification', 'invite_link'));

        $this->actingAs($owner)->post('/settings/team', [
            'invitation_verification' => 'email_link',
        ])->assertRedirect();

        $tenant->refresh();
        $this->assertSame('email_link', $tenant->getSetting('invitations.verification'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.team_updated']);
    }

    public function test_team_settings_reject_an_unknown_policy(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)
            ->post('/settings/team', ['invitation_verification' => 'whatever'])
            ->assertSessionHasErrors('invitation_verification');
    }

    public function test_cashier_cannot_change_team_settings(): void
    {
        [$tenant] = $this->tenantWithOwner();

        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/settings/team')->assertForbidden();
        $this->actingAs($cashier)->post('/settings/team', ['invitation_verification' => 'none'])->assertForbidden();
    }

    public function test_checklist_items_are_actionable_and_complete_truthfully(): void
    {
        [$tenant] = $this->tenantWithOwner();
        $service = app(OnboardingService::class);

        $checklist = collect($service->checklist($tenant));

        // Every incomplete item links to where it can be completed.
        foreach ($checklist->where('done', false) as $item) {
            $this->assertNotNull($item['action'], "checklist item {$item['key']} has no action");
            $this->assertNotSame('', $item['action']['href']);
        }

        $this->assertStringContainsString('/settings/company', $checklist->firstWhere('key', 'company')['action']['href']);
        $this->assertFalse($checklist->firstWhere('key', 'payments')['done']);
        $this->assertFalse($checklist->firstWhere('key', 'staff')['done']);

        // Configuring a payment gateway marks it done.
        $tenant->paymentGateways()->create([
            'provider' => 'cash',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'is_default' => true,
        ]);

        // Adding a second user marks the team step done.
        User::factory()->forTenant($tenant)->create();

        $fresh = collect($service->checklist($tenant->fresh()));
        $this->assertTrue($fresh->firstWhere('key', 'payments')['done']);
        $this->assertTrue($fresh->firstWhere('key', 'staff')['done']);
        $this->assertNull($fresh->firstWhere('key', 'payments')['action']);
    }
}
