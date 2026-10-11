<?php

namespace App\Domain\Accounting;

use App\Domain\Accounting\Enums\ExpenseStatus;
use App\Domain\Accounting\Enums\TransactionCategory;
use App\Domain\Accounting\Models\Expense;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Auditing\AuditLogger;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Expense capture with an approval workflow. Approved expenses post a signed
 * movement to the chosen financial account.
 */
class ExpenseService
{
    public function __construct(
        protected AccountingService $accounting,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Expense
    {
        $amount = round((float) $data['amount'], 2);

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Expense amount must be greater than zero.']);
        }

        $limit = $this->context->tenant()?->getSetting('expenses.auto_approve_limit');
        $autoApprove = $limit !== null && $amount <= (float) $limit;

        return DB::transaction(function () use ($data, $amount, $user, $autoApprove) {
            $expense = Expense::create([
                'tenant_id' => $user->tenant_id,
                'branch_id' => $data['branch_id'] ?? null,
                'expense_category_id' => $data['expense_category_id'] ?? null,
                'financial_account_id' => $data['financial_account_id'] ?? null,
                'amount' => $amount,
                'expense_date' => $data['expense_date'] ?? now()->toDateString(),
                'payment_method' => $data['payment_method'] ?? null,
                'reference' => $data['reference'] ?? null,
                'description' => $data['description'],
                'status' => $autoApprove ? ExpenseStatus::Approved : ExpenseStatus::Submitted,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->getKey(),
                'approved_at' => $autoApprove ? now() : null,
            ]);

            if ($autoApprove) {
                $this->postToAccount($expense);
            }

            $this->audit->log('expense.created', $expense, [
                'amount' => $amount,
                'auto_approved' => $autoApprove,
            ], $user, $user->tenant_id);

            return $expense;
        });
    }

    public function approve(Expense $expense, User $user): Expense
    {
        if ($expense->status !== ExpenseStatus::Submitted) {
            throw ValidationException::withMessages(['status' => 'Only submitted expenses can be approved.']);
        }

        DB::transaction(function () use ($expense, $user) {
            $this->postToAccount($expense);

            $expense->forceFill([
                'status' => ExpenseStatus::Approved,
                'approved_by' => $user->getKey(),
                'approved_at' => now(),
            ])->save();

            $this->audit->log('expense.approved', $expense, [], $user, $expense->tenant_id);
        });

        return $expense->fresh();
    }

    public function reject(Expense $expense, User $user): Expense
    {
        if ($expense->status !== ExpenseStatus::Submitted) {
            throw ValidationException::withMessages(['status' => 'Only submitted expenses can be rejected.']);
        }

        $expense->forceFill([
            'status' => ExpenseStatus::Rejected,
            'approved_by' => $user->getKey(),
            'approved_at' => now(),
        ])->save();

        $this->audit->log('expense.rejected', $expense, [], $user, $expense->tenant_id);

        return $expense;
    }

    protected function postToAccount(Expense $expense): void
    {
        if (! $expense->financial_account_id) {
            return;
        }

        $account = FinancialAccount::query()->findOrFail($expense->financial_account_id);

        $this->accounting->record(
            $account,
            -1 * (float) $expense->amount,
            TransactionCategory::Expense,
            $expense->description,
            $expense,
            $expense->branch_id,
        );
    }
}
