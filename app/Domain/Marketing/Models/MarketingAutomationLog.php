<?php

namespace App\Domain\Marketing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The per-step execution record. The unique index on
 * (enrollment_id, step_id, attempts) is the idempotency key: replaying a step
 * cannot produce a second email.
 */
class MarketingAutomationLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'enrollment_id',
        'step_id',
        'status',
        'message',
        'executed_at',
        'next_run_at',
        'attempts',
    ];

    protected function casts(): array
    {
        return [
            'executed_at' => 'datetime',
            'next_run_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(MarketingAutomationEnrollment::class, 'enrollment_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(MarketingAutomationStep::class, 'step_id');
    }
}
