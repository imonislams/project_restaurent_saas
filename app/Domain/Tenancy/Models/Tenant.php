<?php

namespace App\Domain\Tenancy\Models;

use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Inventory\Models\Unit;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Factories\TenantFactory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'business_email',
        'status',
        'trial_ends_at',
        'onboarding_completed_at',
        'onboarding_step',
        'first_sale_at',
        'suspended_at',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'status' => TenantStatus::class,
            'trial_ends_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'first_sale_at' => 'datetime',
            'suspended_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    protected static function newFactory(): TenantFactory
    {
        return TenantFactory::new();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    public function paymentMethods(): HasMany
    {
        return $this->hasMany(PaymentMethod::class);
    }

    public function financialAccounts(): HasMany
    {
        return $this->hasMany(FinancialAccount::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    public function currentPlan(): ?Plan
    {
        return Cache::remember(
            "tenant:{$this->getKey()}:plan",
            now()->addMinutes(5),
            fn () => $this->subscription?->plan,
        );
    }

    public static function forgetEntitlementCache(int $tenantId): void
    {
        Cache::forget("tenant:{$tenantId}:plan");
    }

    /** Feature entitlements resolved server-side from the plan. No plan = unrestricted. */
    public function hasFeature(string $feature): bool
    {
        $plan = $this->currentPlan();

        return $plan === null ? true : $plan->hasFeature($feature);
    }

    public function planLimit(string $metric): ?int
    {
        return $this->currentPlan()?->limit($metric);
    }

    public function primaryBranch(): HasOne
    {
        return $this->hasOne(Branch::class)->where('is_primary', true);
    }

    public function isActive(): bool
    {
        return $this->status->isActive();
    }

    public function canAccess(): bool
    {
        return $this->status->canAccess();
    }

    public function onTrial(): bool
    {
        return $this->trial_ends_at !== null && $this->trial_ends_at->isFuture();
    }

    public function hasCompletedOnboarding(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    public function hasRecordedFirstSale(): bool
    {
        return $this->first_sale_at !== null;
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings, $key, $default);
    }

    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings ?? [];
        data_set($settings, $key, $value);
        $this->settings = $settings;
    }

    /**
     * Merge multiple settings at once (dot-notation keys supported).
     *
     * @param  array<string, mixed>  $values
     */
    public function mergeSettings(array $values): void
    {
        $settings = $this->settings ?? [];

        foreach ($values as $key => $value) {
            data_set($settings, $key, $value);
        }

        $this->settings = $settings;
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }
}
