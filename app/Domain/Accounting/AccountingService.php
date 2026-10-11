<?php

namespace App\Domain\Accounting;

use App\Domain\Accounting\Enums\TransactionCategory;
use App\Domain\Accounting\Models\AccountTransfer;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Accounting\Models\FinancialTransaction;
use App\Domain\Auditing\AuditLogger;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Writes the append-only account ledger and performs account transfers.
 * Balances are derived from the ledger; transactions are never edited.
 */
class AccountingService
{
    public function __construct(protected AuditLogger $audit) {}

    public function record(
        FinancialAccount $account,
        float $amount,
        TransactionCategory $category,
        ?string $description = null,
        ?Model $source = null,
        ?int $branchId = null,
        ?string $occurredAt = null,
    ): FinancialTransaction {
        return FinancialTransaction::create([
            'tenant_id' => $account->tenant_id,
            'financial_account_id' => $account->getKey(),
            'branch_id' => $branchId ?? $account->branch_id,
            'amount' => round($amount, 2),
            'category' => $category,
            'description' => $description,
            'source_type' => $source?->getMorphClass(),
            'source_id' => $source?->getKey(),
            'occurred_at' => $occurredAt ?? now(),
            'created_by' => auth()->id(),
        ]);
    }

    public function transfer(
        FinancialAccount $from,
        FinancialAccount $to,
        float $amount,
        User $user,
        ?string $reference = null,
        ?string $notes = null,
    ): AccountTransfer {
        $amount = round($amount, 2);

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Transfer amount must be greater than zero.']);
        }

        if ($from->is($to)) {
            throw ValidationException::withMessages(['to_account_id' => 'Source and destination accounts must differ.']);
        }

        return DB::transaction(function () use ($from, $to, $amount, $reference, $notes, $user) {
            $transfer = AccountTransfer::create([
                'tenant_id' => $from->tenant_id,
                'from_account_id' => $from->getKey(),
                'to_account_id' => $to->getKey(),
                'amount' => $amount,
                'reference' => $reference,
                'notes' => $notes,
                'transferred_at' => now(),
                'created_by' => $user->getKey(),
            ]);

            $this->record($from, -$amount, TransactionCategory::Transfer, 'Transfer to '.$to->name, $transfer, $from->branch_id);
            $this->record($to, $amount, TransactionCategory::Transfer, 'Transfer from '.$from->name, $transfer, $to->branch_id);

            $this->audit->log('account.transfer', $transfer, [
                'from' => $from->name,
                'to' => $to->name,
                'amount' => $amount,
            ], $user, $from->tenant_id);

            return $transfer;
        });
    }
}
