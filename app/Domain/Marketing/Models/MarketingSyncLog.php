<?php

namespace App\Domain\Marketing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The record behind every "last successful sync" and every honest "no data yet"
 * state. Append-only in practice: a row is written per attempt.
 */
class MarketingSyncLog extends Model
{
    protected $fillable = [
        'integration_id',
        'direction',
        'entity',
        'status',
        'items_count',
        'started_at',
        'finished_at',
        'duration_ms',
        'error',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'items_count' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'duration_ms' => 'integer',
            'meta' => 'array',
        ];
    }

    public function integration(): BelongsTo
    {
        return $this->belongsTo(MarketingIntegration::class, 'integration_id');
    }

    public function succeeded(): bool
    {
        return $this->status === 'ok';
    }
}
