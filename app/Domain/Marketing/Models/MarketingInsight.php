<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A generated observation about the marketing data, with its supporting figures.
 * Acknowledging one records who looked at it.
 */
class MarketingInsight extends Model
{
    protected $fillable = [
        'rule_id',
        'severity',
        'title',
        'body',
        'data',
        'generated_at',
        'acknowledged_at',
        'acknowledged_by',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'generated_at' => 'datetime',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(MarketingAlertRule::class, 'rule_id');
    }

    public function acknowledger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function isAcknowledged(): bool
    {
        return $this->acknowledged_at !== null;
    }

    public function scopeUnacknowledged($query)
    {
        return $query->whereNull('acknowledged_at');
    }
}
