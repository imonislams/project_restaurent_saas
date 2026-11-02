<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\AlertOperator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A threshold rule evaluated by marketing:evaluate-alerts. Cooldown prevents the
 * same breach raising an alert on every run.
 */
class MarketingAlertRule extends Model
{
    protected $fillable = [
        'key',
        'name',
        'metric',
        'operator',
        'threshold',
        'window',
        'channel',
        'recipients',
        'is_enabled',
        'last_triggered_at',
        'cooldown_minutes',
    ];

    protected function casts(): array
    {
        return [
            'operator' => AlertOperator::class,
            'threshold' => 'decimal:4',
            'recipients' => 'array',
            'is_enabled' => 'boolean',
            'last_triggered_at' => 'datetime',
            'cooldown_minutes' => 'integer',
        ];
    }

    public function insights(): HasMany
    {
        return $this->hasMany(MarketingInsight::class, 'rule_id');
    }

    /** Whether the rule is allowed to fire again yet. */
    public function isCoolingDown(): bool
    {
        if ($this->last_triggered_at === null) {
            return false;
        }

        return $this->last_triggered_at->copy()->addMinutes($this->cooldown_minutes)->greaterThan(Carbon::now());
    }

    public function matches(float $value): bool
    {
        return $this->operator->evaluate($value, (float) $this->threshold);
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }
}
