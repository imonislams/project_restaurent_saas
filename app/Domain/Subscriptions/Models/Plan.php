<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Subscriptions\Enums\PlanVisibility;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A platform-level subscription plan. Not tenant-scoped — it is shared by all
 * tenants and managed by platform admins.
 */
class Plan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'currency',
        'price_monthly',
        'price_yearly',
        'trial_days',
        'features',
        'limits',
        'is_active',
        'visibility',
        'version',
        'archived_at',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'trial_days' => 'integer',
            'features' => 'array',
            'limits' => 'array',
            'is_active' => 'boolean',
            'visibility' => PlanVisibility::class,
            'version' => 'integer',
            'archived_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function prices(): HasMany
    {
        return $this->hasMany(PlanPrice::class);
    }

    public function limit(string $metric): ?int
    {
        $value = data_get($this->limits, $metric);

        return $value === null ? null : (int) $value;
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function isPublic(): bool
    {
        return $this->visibility === PlanVisibility::Public;
    }

    /** Is this plan still selectable for new/changed subscriptions? */
    public function isSelectable(): bool
    {
        return $this->is_active && ! $this->isArchived();
    }
}
