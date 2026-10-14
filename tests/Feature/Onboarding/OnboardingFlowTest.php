<?php

namespace Tests\Feature\Onboarding;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Models\BusinessHour;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OnboardingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function tenantUser(?Tenant $tenant = null): User
    {
        return User::factory()
            ->forTenant($tenant ?? Tenant::factory()->notOnboarded()->create())
            ->create();
    }

    protected function validProfilePayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Alex Owner',
            'phone' => '+8801700000000',
            'role_title' => 'Owner',
        ], $overrides);
    }

    protected function validCompanyPayload(array $overrides = []): array
    {
        return array_merge([
            'legal_name' => 'Alex Foods Ltd',
            'phone' => '+8801700000000',
            'email' => 'hello@alexfoods.test',
            'tax_id' => 'VAT-123',
            'address' => '12 Gulshan Ave, Dhaka',
            'country' => 'BD',
            'currency' => 'BDT',
            'timezone' => 'Asia/Dhaka',
        ], $overrides);
    }

    protected function validBranchPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Main Branch',
            'code' => 'MAIN',
            'address' => '12 Gulshan Ave, Dhaka',
            'phone' => '+8801700000000',
            'timezone' => 'Asia/Dhaka',
            'currency' => 'BDT',
            'service_types' => ['dine_in', 'takeaway'],
        ], $overrides);
    }

    public function test_registration_redirects_to_verification(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $response = $this->post('/register', [
            'identifier_type' => 'email',
            'name' => 'Owner',
            'restaurant_name' => 'My Restaurant',
            'email' => 'owner@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertRedirect(route('verification.notice'));
    }

    public function test_onboarding_index_redirects_to_first_incomplete_step(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->get('/onboarding')
            ->assertRedirect(route('onboarding.show', 'profile'));
    }

    public function test_profile_step_saves_and_advances(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)
            ->get('/onboarding/profile')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Onboarding/Show')
                ->where('step', 'profile'));

        $this->actingAs($user)
            ->post('/onboarding/profile', $this->validProfilePayload())
            ->assertRedirect(route('onboarding.show', 'company'));

        $user->refresh();
        $tenant->refresh();

        $this->assertSame('Alex Owner', $user->name);
        $this->assertSame('+8801700000000', $user->phone);
        $this->assertNotNull($tenant->getSetting('profile.completed_at'));
        $this->assertSame('company', $tenant->onboarding_step);
    }

    public function test_payments_step_configures_real_gateways_with_a_default(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)
            ->post('/onboarding/payments', [
                'gateways' => [
                    ['provider' => 'cash', 'environment' => 'sandbox', 'is_enabled' => true],
                    ['provider' => 'sslcommerz', 'environment' => 'sandbox', 'is_enabled' => true, 'credentials' => ['store_id' => 's', 'store_password' => 'p']],
                ],
                'default_provider' => 'sslcommerz',
            ])
            ->assertRedirect(route('onboarding.show', 'menu'));

        $this->assertDatabaseHas('tenant_gateways', ['tenant_id' => $tenant->id, 'provider' => 'cash', 'is_enabled' => true]);

        $ssl = TenantGateway::withoutGlobalScopes()->where('provider', 'sslcommerz')->firstOrFail();

        $this->assertTrue($ssl->is_enabled);
        $this->assertTrue($ssl->is_default);
        $this->assertFalse(TenantGateway::withoutGlobalScopes()->where('provider', 'cash')->firstOrFail()->is_default);
        $this->assertTrue($tenant->fresh()->getSetting('payments.accept_cash'));
    }

    public function test_payments_step_requires_credentials_for_online_gateways(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->post('/onboarding/payments', [
                'gateways' => [
                    ['provider' => 'bkash', 'environment' => 'sandbox', 'is_enabled' => true],
                ],
            ])
            ->assertSessionHasErrors('gateways');
    }

    public function test_company_step_renders_and_saves_then_advances(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)
            ->get('/onboarding/company')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Onboarding/Show')
                ->where('step', 'company'));

        $this->actingAs($user)
            ->post('/onboarding/company', $this->validCompanyPayload())
            ->assertRedirect(route('onboarding.show', 'branch'));

        $tenant->refresh();
        $this->assertSame('Alex Foods Ltd', $tenant->getSetting('company.legal_name'));
        $this->assertSame('BDT', $tenant->getSetting('region.currency'));
        $this->assertSame('Asia/Dhaka', $tenant->getSetting('region.timezone'));
    }

    public function test_company_step_validates_required_fields(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->post('/onboarding/company', ['legal_name' => '', 'country' => 'XX'])
            ->assertSessionHasErrors(['legal_name', 'currency', 'timezone']);
    }

    public function test_branch_step_creates_a_primary_branch(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)
            ->post('/onboarding/branch', $this->validBranchPayload())
            ->assertRedirect(route('onboarding.show', 'hours'));

        $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();

        $this->assertNotNull($branch);
        $this->assertTrue($branch->is_primary);
        $this->assertSame('Main Branch', $branch->name);
        $this->assertSame(['dine_in', 'takeaway'], $branch->service_types);
    }

    public function test_hours_step_persists_all_days(): void
    {
        $user = $this->tenantUser();
        $this->actingAs($user)->post('/onboarding/branch', $this->validBranchPayload());

        $days = [];
        for ($i = 0; $i <= 6; $i++) {
            $days[] = [
                'day_of_week' => $i,
                'is_closed' => $i === 0,
                'opens_at' => '09:00',
                'closes_at' => '22:00',
            ];
        }

        $this->actingAs($user)
            ->post('/onboarding/hours', ['days' => $days])
            ->assertRedirect(route('onboarding.show', 'tax'));

        $this->assertSame(7, BusinessHour::count());
    }

    public function test_tax_and_receipt_steps_persist_and_advance(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)
            ->post('/onboarding/tax', [
                'tax_name' => 'VAT',
                'tax_rate' => 15,
                'tax_inclusive' => false,
            ])
            ->assertRedirect(route('onboarding.show', 'receipt'));

        $this->actingAs($user)
            ->post('/onboarding/receipt', [
                'receipt_header' => 'Alex Foods',
                'receipt_footer' => 'Thanks!',
                'receipt_show_tax' => true,
                'receipt_show_logo' => false,
            ])
            ->assertRedirect(route('onboarding.show', 'payments'));

        $tenant->refresh();
        $this->assertSame(15.0, (float) $tenant->getSetting('tax.rate'));
        $this->assertSame('Alex Foods', $tenant->getSetting('receipt.header'));
    }

    public function test_optional_step_can_be_skipped(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->post('/onboarding/skip/tax')
            ->assertRedirect(route('onboarding.show', 'receipt'));
    }

    public function test_required_step_cannot_be_skipped(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->from('/onboarding/company')
            ->post('/onboarding/skip/company')
            ->assertRedirect('/onboarding/company')
            ->assertSessionHas('error');
    }

    public function test_completion_is_blocked_until_required_steps_are_done(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->post('/onboarding/complete')
            ->assertRedirect(route('onboarding.show', 'profile'))
            ->assertSessionHas('error');

        $this->assertNull($user->tenant->fresh()->onboarding_completed_at);
    }

    public function test_completing_onboarding_marks_tenant_and_redirects_to_dashboard(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)->post('/onboarding/profile', $this->validProfilePayload());
        $this->actingAs($user)->post('/onboarding/company', $this->validCompanyPayload());
        $this->actingAs($user)->post('/onboarding/branch', $this->validBranchPayload());

        $this->actingAs($user)
            ->post('/onboarding/complete')
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('success');

        $tenant->refresh();
        $this->assertNotNull($tenant->onboarding_completed_at);
        $this->assertTrue($tenant->hasCompletedOnboarding());
    }

    public function test_dashboard_redirects_to_onboarding_while_incomplete(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect(route('onboarding.show', 'profile'));
    }

    public function test_dashboard_shows_analytics_once_onboarding_is_complete(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

        $this->actingAs($user)->post('/onboarding/profile', $this->validProfilePayload());
        $this->actingAs($user)->post('/onboarding/company', $this->validCompanyPayload());
        $this->actingAs($user)->post('/onboarding/branch', $this->validBranchPayload());
        $this->actingAs($user)->post('/onboarding/complete');

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('checklist')
                ->has('progress.steps', 10)
                ->has('analytics')
                ->has('customerAnalytics')
                ->has('business360')
                ->where('tenant.name', $tenant->name));
    }

    public function test_platform_admins_have_no_onboarding(): void
    {
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)->get('/onboarding')->assertForbidden();
    }

    public function test_onboarding_data_is_isolated_between_tenants(): void
    {
        $userA = $this->tenantUser();
        $userB = $this->tenantUser();

        $this->actingAs($userA)->post('/onboarding/company', $this->validCompanyPayload([
            'legal_name' => 'Tenant A Foods',
        ]));

        $this->actingAs($userA)->post('/onboarding/branch', $this->validBranchPayload([
            'name' => 'A Branch',
        ]));

        // Tenant B still starts fresh — never sees A's progress.
        $this->actingAs($userB)
            ->get('/onboarding')
            ->assertRedirect(route('onboarding.show', 'profile'));

        $this->assertSame(1, Branch::withoutGlobalScopes()->where('tenant_id', $userA->tenant_id)->count());
        $this->assertSame(0, Branch::withoutGlobalScopes()->where('tenant_id', $userB->tenant_id)->count());
    }
}
