<?php

namespace App\Domain\Billing\Models;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Raw gateway event, stored before processing and deduplicated by provider + event id. */
class PlatformPaymentEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'provider',
        'event_id',
        'event_type',
        'payload',
        'signature_valid',
        'processed',
        'processed_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'signature_valid' => 'boolean',
            'processed' => 'boolean',
            'processed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
