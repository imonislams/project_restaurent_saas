<?php

namespace Tests\Feature\Onboarding;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Models\BusinessHour;
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
            ->forTenant($tenant ?? Tenant::factory()->create())
            ->create();
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

    public function test_registration_redirects_to_onboarding(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $response = $this->post('/register', [
            'name' => 'Owner',
            'restaurant_name' => 'My Restaurant',
            'email' => 'owner@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertRedirect(route('onboarding.index'));
    }

    public function test_onboarding_index_redirects_to_first_incomplete_step(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->get('/onboarding')
            ->assertRedirect(route('onboarding.show', 'company'));
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
            ->assertRedirect(route('onboarding.show', 'review'));

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
            ->assertRedirect(route('onboarding.show', 'company'))
            ->assertSessionHas('error');

        $this->assertNull($user->tenant->fresh()->onboarding_completed_at);
    }

    public function test_completing_onboarding_marks_tenant_and_redirects_to_dashboard(): void
    {
        $user = $this->tenantUser();
        $tenant = $user->tenant;

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

    public function test_dashboard_shows_the_activation_checklist(): void
    {
        $user = $this->tenantUser();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('checklist')
                ->has('progress.steps', 6)
                ->where('tenant.name', $user->tenant->name));
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
            ->assertRedirect(route('onboarding.show', 'company'));

        $this->assertSame(1, Branch::withoutGlobalScopes()->where('tenant_id', $userA->tenant_id)->count());
        $this->assertSame(0, Branch::withoutGlobalScopes()->where('tenant_id', $userB->tenant_id)->count());
    }
}
