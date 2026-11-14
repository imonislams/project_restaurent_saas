<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\AutomationTrigger;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An automation workflow: a trigger plus an ordered list of steps.
 * `is_system` marks the seeded presets so the operator knows which are built in.
 */
class MarketingAutomation extends Model
{
    protected $fillable = [
        'name',
        'key',
        'description',
        'trigger_type',
        'trigger_config',
        'status',
        'is_system',
        'last_run_at',
        'run_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'trigger_type' => AutomationTrigger::class,
            'trigger_config' => 'array',
            'is_system' => 'boolean',
            'last_run_at' => 'datetime',
            'run_count' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(MarketingAutomationStep::class, 'automation_id')->orderBy('sort_order');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(MarketingAutomationEnrollment::class, 'automation_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForTrigger($query, AutomationTrigger $trigger)
    {
        return $query->where('trigger_type', $trigger->value);
    }
}
