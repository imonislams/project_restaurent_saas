<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\StepType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One step in a workflow: send an email, wait, branch on a condition, or act.
 */
class MarketingAutomationStep extends Model
{
    protected $fillable = [
        'automation_id',
        'sort_order',
        'type',
        'config',
        'template_key',
        'delay_value',
        'delay_unit',
    ];

    protected function casts(): array
    {
        return [
            'type' => StepType::class,
            'config' => 'array',
            'sort_order' => 'integer',
            'delay_value' => 'integer',
        ];
    }

    public function automation(): BelongsTo
    {
        return $this->belongsTo(MarketingAutomation::class, 'automation_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(MarketingAutomationLog::class, 'step_id');
    }

    /** The delay this step introduces, in seconds. Zero when not a wait step. */
    public function delaySeconds(): int
    {
        $value = (int) ($this->delay_value ?? 0);

        return match ($this->delay_unit) {
            'minutes' => $value * 60,
            'hours' => $value * 3600,
            'days' => $value * 86400,
            default => $value,
        };
    }
}
