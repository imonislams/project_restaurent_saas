<?php

namespace Tests\Feature\Accounting;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Accounting\Enums\AccountType;
use App\Domain\Accounting\Models\Expense;
use App\Domain\Accounting\Models\ExpenseCategory;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Accounting\Models\FinancialTransaction;
use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected FinancialAccount $account;

    protected ExpenseCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id]);
        app(ProvisionAccountingDefaults::class)->forTenant($this->tenant);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);

        $this->account = FinancialAccount::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Cash',
            'type' => AccountType::Cash,
            'opening_balance' => 500,
        ]);

        $this->category = ExpenseCategory::create(['tenant_id' => $this->tenant->id, 'name' => 'Utilities']);
    }

    protected function createExpense(float $amount, array $overrides = [])
    {
        return $this->actingAs($this->owner)->post('/expenses', array_merge([
            'branch_id' => $this->branch->id,
            'expense_category_id' => $this->category->id,
            'financial_account_id' => $this->account->id,
            'amount' => $amount,
            'description' => 'Electricity bill',
        ], $overrides));
    }

    public function test_an_expense_is_created_pending_and_does_not_move_money(): void
    {
        $this->createExpense(120)->assertRedirect();

        $expense = Expense::firstOrFail();
        $this->assertSame('submitted', $expense->status->value);
        $this->assertSame(0, FinancialTransaction::count());
        $this->assertSame(500.0, $this->account->balance());
    }

    public function test_approving_an_expense_posts_a_movement_to_the_account(): void
    {
        $this->createExpense(120);
        $expense = Expense::firstOrFail();

        $this->actingAs($this->owner)->post("/expenses/{$expense->id}/approve")->assertRedirect();

        $this->assertSame('approved', $expense->fresh()->status->value);
        $this->assertSame(1, FinancialTransaction::count());
        $this->assertSame(380.0, $this->account->balance());
        $this->assertDatabaseHas('financial_transactions', ['category' => 'expense', 'amount' => -120]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'expense.approved']);
    }

    public function test_rejecting_an_expense_leaves_money_untouched(): void
    {
        $this->createExpense(120);
        $expense = Expense::firstOrFail();

        $this->actingAs($this->owner)->post("/expenses/{$expense->id}/reject")->assertRedirect();

        $this->assertSame('rejected', $expense->fresh()->status->value);
        $this->assertSame(0, FinancialTransaction::count());
        $this->assertSame(500.0, $this->account->balance());
    }

    public function test_expenses_below_the_limit_are_auto_approved(): void
    {
        $this->tenant->mergeSettings(['expenses' => ['auto_approve_limit' => 200]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->createExpense(150)->assertRedirect();

        $expense = Expense::firstOrFail();
        $this->assertSame('approved', $expense->status->value);
        $this->assertSame(350.0, $this->account->balance());
    }

    public function test_expenses_above_the_limit_stay_pending(): void
    {
        $this->tenant->mergeSettings(['expenses' => ['auto_approve_limit' => 100]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->createExpense(150);

        $this->assertSame('submitted', Expense::firstOrFail()->status->value);
        $this->assertSame(500.0, $this->account->balance());
    }

    public function test_a_user_without_expense_permission_cannot_record(): void
    {
        $nobody = User::factory()->forTenant($this->tenant)->create();

        $this->actingAs($nobody)->post('/expenses', [
            'amount' => 10,
            'description' => 'Test',
        ])->assertForbidden();
    }

    public function test_expense_categories_can_be_created(): void
    {
        $this->actingAs($this->owner)->post('/expenses/categories', [
            'name' => 'Rent',
            'type' => 'expense',
        ])->assertRedirect();

        $this->assertDatabaseHas('expense_categories', ['name' => 'Rent']);
    }
}
