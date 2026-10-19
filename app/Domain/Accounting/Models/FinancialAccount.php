<?php

namespace App\Domain\Accounting\Models;

use App\Domain\Accounting\Enums\AccountType;
use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialAccount extends Model
{
    use BelongsToTenant, BelongsToBranch, SoftDeletes;

    protected static function branchScopeAllowsNull(): bool
    {
        return true;
    }

    protected $fillable = ['tenant_id', 'branch_id', 'name', 'type', 'opening_balance', 'is_active'];

    protected function casts(): array
    {
        return [
            'type' => AccountType::class,
            'opening_balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(FinancialTransaction::class);
    }

    /** Balance = opening balance + the (signed) transaction ledger. */
    public function balance(): float
    {
        return round((float) $this->opening_balance + (float) $this->transactions()->sum('amount'), 2);
    }
}
