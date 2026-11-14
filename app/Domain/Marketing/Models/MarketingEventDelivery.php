<?php

namespace App\Domain\Marketing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-provider delivery state for one event. The unique index on
 * (provider, external_event_id) is the guarantee that a retried job cannot send
 * the same event twice.
 */
class MarketingEventDelivery extends Model
{
    protected $fillable = [
        'marketing_event_id',
        'provider',
        'external_event_id',
        'status',
        'attempts',
        'http_status',
        'response',
        'error',
        'sent_at',
        'next_retry_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'http_status' => 'integer',
            'sent_at' => 'datetime',
            'next_retry_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(MarketingEvent::class, 'marketing_event_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isSent(): bool
    {
        return $this->status === 'sent';
    }

    /** A failure that will not be retried (4xx, or retries exhausted). */
    public function isTerminalFailure(): bool
    {
        return $this->status === 'failed';
    }
}
