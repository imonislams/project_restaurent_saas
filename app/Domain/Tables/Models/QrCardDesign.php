<?php

namespace App\Domain\Tables\Models;

use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Factories\QrCardDesignFactory;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A named, editable QR card design. `canvas` is the editor document
 * (millimetre-positioned elements); a null branch_id makes the design the
 * tenant-wide default rather than belonging to a single branch.
 */
class QrCardDesign extends Model
{
    use BelongsToBranch, BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'name',
        'canvas',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'canvas' => 'array',
            'is_active' => 'boolean',
        ];
    }

    protected static function newFactory(): QrCardDesignFactory
    {
        return QrCardDesignFactory::new();
    }

    /** A null branch is company-wide, so it must stay visible to every branch. */
    protected static function branchScopeAllowsNull(): bool
    {
        return true;
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
