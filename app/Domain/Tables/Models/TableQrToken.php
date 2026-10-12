<?php

namespace App\Domain\Tables\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Factories\TableQrTokenFactory;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Rotatable public QR identity for a table. The token is opaque and high
 * entropy and identifies the table only — never a session, participant or
 * customer.
 */
class TableQrToken extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'table_id',
        'token',
        'is_active',
        'revoked_at',
        'created_by',
        'scan_count',
        'last_scanned_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'revoked_at' => 'datetime',
            'scan_count' => 'integer',
            'last_scanned_at' => 'datetime',
        ];
    }

    protected static function newFactory(): TableQrTokenFactory
    {
        return TableQrTokenFactory::new();
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isUsable(): bool
    {
        return $this->is_active && $this->revoked_at === null;
    }
}
