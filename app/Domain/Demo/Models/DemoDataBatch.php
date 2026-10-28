<?php

namespace App\Domain\Demo\Models;

use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One demo-generation run for a tenant. Holds the run's progress, the ids of
 * everything it created (refs) and the running counters shown to the owner.
 */
class DemoDataBatch extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_RUNNING = 'running';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REMOVED = 'removed';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'status',
        'days',
        'current_step',
        'steps_total',
        'steps_done',
        'completed_steps',
        'refs',
        'counts',
        'error',
        'started_at',
        'completed_at',
        'removed_at',
    ];

    protected function casts(): array
    {
        return [
            'days' => 'integer',
            'steps_total' => 'integer',
            'steps_done' => 'integer',
            'completed_steps' => 'array',
            'refs' => 'array',
            'counts' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'removed_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Whether the batch still expects steps to run. */
    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_RUNNING], true);
    }

    public function isStepDone(string $key): bool
    {
        return in_array($key, $this->completed_steps ?? [], true);
    }

    public function progressPercent(): int
    {
        if ($this->steps_total <= 0) {
            return 0;
        }

        return (int) min(100, round($this->steps_done / $this->steps_total * 100));
    }

    public function ref(string $key, mixed $default = null): mixed
    {
        return data_get($this->refs, $key, $default);
    }

    /** @param array<string, mixed> $values */
    public function mergeRefs(array $values): void
    {
        $refs = $this->refs ?? [];

        foreach ($values as $key => $value) {
            data_set($refs, $key, $value);
        }

        $this->refs = $refs;
    }

    /**
     * Add to running counters (used by the per-day steps).
     *
     * @param  array<string, int|float>  $values
     */
    public function incrementCounts(array $values): void
    {
        $counts = $this->counts ?? [];

        foreach ($values as $key => $value) {
            $counts[$key] = round((float) ($counts[$key] ?? 0) + (float) $value, 4);
        }

        $this->counts = $counts;
    }

    /**
     * Set absolute counters (totals, currency, labels).
     *
     * @param  array<string, mixed>  $values
     */
    public function setCounts(array $values): void
    {
        $counts = $this->counts ?? [];

        foreach ($values as $key => $value) {
            $counts[$key] = $value;
        }

        $this->counts = $counts;
    }

    public function count(string $key): int|float
    {
        return $this->counts[$key] ?? 0;
    }
}
