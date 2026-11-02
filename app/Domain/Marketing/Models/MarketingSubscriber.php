<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A marketing email recipient. Distinct from a lead: someone can subscribe without
 * ever enquiring, and a lead can decline marketing consent.
 */
class MarketingSubscriber extends Model
{
    protected $fillable = [
        'email',
        'name',
        'lead_id',
        'tenant_id',
        'source',
        'status',
        'consent_at',
        'consent_source',
        'unsubscribed_at',
        'unsubscribe_reason',
        'locale',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'consent_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(MarketingLead::class, 'lead_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isSubscribed(): bool
    {
        return $this->status === 'subscribed';
    }

    public function scopeSubscribed($query)
    {
        return $query->where('status', 'subscribed');
    }
}
