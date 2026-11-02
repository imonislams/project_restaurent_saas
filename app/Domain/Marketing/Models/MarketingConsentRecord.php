<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only consent history. There is deliberately no updated_at: a consent
 * change writes a new row and the previous rows are never touched.
 */
class MarketingConsentRecord extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'visitor_id',
        'user_id',
        'tenant_id',
        'categories',
        'version',
        'action',
        'ip_hash',
        'user_agent',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'categories' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function granted(string $category): bool
    {
        return (bool) ($this->categories[$category] ?? false);
    }
}
