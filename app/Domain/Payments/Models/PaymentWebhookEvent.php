<?php

namespace App\Domain\Payments\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

/**
 * Raw, deduplicated provider webhook events. Stored before processing so an
 * event can never be processed twice.
 */
class PaymentWebhookEvent extends Model
{
    use BelongsToTenant;

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
}
