<?php

namespace Tests\Feature\Accounting;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Accounting\Enums\AccountType;
use App\Domain\Accounting\Models\AccountTransfer;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Accounting\Models\FinancialTransaction;
use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $owner;

    protected FinancialAccount $cash;

    protected FinancialAccount $bank;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $branch = Branch::factory()->create(['tenant_id' => $this->tenant->id]);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);

        $this->cash = FinancialAccount::create(['tenant_id' => $this->tenant->id, 'branch_id' => $branch->id, 'name' => 'Cash', 'type' => AccountType::Cash, 'opening_balance' => 300]);
        $this->bank = FinancialAccount::create(['tenant_id' => $this->tenant->id, 'name' => 'Bank', 'type' => AccountType::Bank, 'opening_balance' => 1000]);
    }

    public function test_registration_provisions_a_default_bank_account_and_a_branch_cash_account(): void
    {
        $this->post('/register', [
            'identifier_type' => 'email',
            'name' => 'Owner',
            'restaurant_name' => 'Spice House',
            'email' => 'new@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect();

        $tenant = Tenant::where('business_email', 'new@example.com')->firstOrFail();
        $this->assertDatabaseHas('financial_accounts', ['tenant_id' => $tenant->id, 'type' => 'bank']);

        $branch = Branch::factory()->create(['tenant_id' => $tenant->id]);
        app(ProvisionAccountingDefaults::class)->cashAccountFor($branch);
        $this->assertDatabaseHas('financial_accounts', ['tenant_id' => $tenant->id, 'branch_id' => $branch->id, 'type' => 'cash']);
    }

    public function test_an_account_can_be_created_with_an_opening_balance(): void
    {
        $this->actingAs($this->owner)->post('/accounts', [
            'name' => 'Mobile Wallet',
            'type' => 'mobile',
            'opening_balance' => 250,
        ])->assertRedirect();

        $account = FinancialAccount::where('name', 'Mobile Wallet')->firstOrFail();
        $this->assertSame(250.0, $account->balance());
    }

    public function test_a_transfer_moves_balance_between_accounts(): void
    {
        $this->actingAs($this->owner)->post('/accounts/transfer', [
            'from_account_id' => $this->cash->id,
            'to_account_id' => $this->bank->id,
            'amount' => 100,
            'reference' => 'DEP-1',
        ])->assertRedirect();

        $this->assertSame(200.0, $this->cash->fresh()->balance());
        $this->assertSame(1100.0, $this->bank->fresh()->balance());
        $this->assertSame(1, AccountTransfer::count());
        $this->assertSame(2, FinancialTransaction::count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'account.transfer']);
    }

    public function test_a_transfer_to_the_same_account_is_rejected(): void
    {
        $this->actingAs($this->owner)->post('/accounts/transfer', [
            'from_account_id' => $this->cash->id,
            'to_account_id' => $this->cash->id,
            'amount' => 50,
        ])->assertSessionHasErrors('to_account_id');

        $this->assertSame(0, AccountTransfer::count());
    }

    public function test_accounts_page_renders(): void
    {
        $this->actingAs($this->owner)
            ->get('/accounts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Accounts/Index')->has('accounts', 2));
    }
}
