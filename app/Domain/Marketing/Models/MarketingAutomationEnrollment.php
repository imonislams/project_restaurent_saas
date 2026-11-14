<?php

namespace App\Domain\Marketing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One subject (a lead or a tenant) progressing through one workflow. The unique
 * index on (automation_id, subject_type, subject_id) guarantees a subject is
 * enrolled once per workflow.
 */
class MarketingAutomationEnrollment extends Model
{
    protected $fillable = [
        'automation_id',
        'subject_type',
        'subject_id',
        'status',
        'current_step',
        'enrolled_at',
        'completed_at',
        'stopped_at',
        'stop_reason',
        'next_run_at',
    ];

    protected function casts(): array
    {
        return [
            'current_step' => 'integer',
            'enrolled_at' => 'datetime',
            'completed_at' => 'datetime',
            'stopped_at' => 'datetime',
            'next_run_at' => 'datetime',
        ];
    }

    public function automation(): BelongsTo
    {
        return $this->belongsTo(MarketingAutomation::class, 'automation_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function logs(): HasMany
    {
        return $this->hasMany(MarketingAutomationLog::class, 'enrollment_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function scopeDue($query)
    {
        return $query->where('status', 'active')
            ->where(fn ($inner) => $inner->whereNull('next_run_at')->orWhere('next_run_at', '<=', now()));
    }
}
