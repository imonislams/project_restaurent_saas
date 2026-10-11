<?php

namespace App\Domain\Branches\Models;

use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Branches\Enums\ServiceType;
use App\Domain\Branches\Factories\BranchFactory;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Kitchen\Models\KitchenStation;
use App\Domain\Tables\Models\DiningArea;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    /** @use HasFactory<BranchFactory> */
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'address',
        'phone',
        'timezone',
        'currency',
        'service_types',
        'is_active',
        'is_primary',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'service_types' => 'array',
            'settings' => 'array',
            'is_active' => 'boolean',
            'is_primary' => 'boolean',
        ];
    }

    protected static function newFactory(): BranchFactory
    {
        return BranchFactory::new();
    }

    public function businessHours(): HasMany
    {
        return $this->hasMany(BusinessHour::class)->orderBy('day_of_week');
    }

    public function stockLocations(): HasMany
    {
        return $this->hasMany(StockLocation::class);
    }

    public function diningAreas(): HasMany
    {
        return $this->hasMany(DiningArea::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(Table::class);
    }

    public function kitchenStations(): HasMany
    {
        return $this->hasMany(KitchenStation::class);
    }

    public function financialAccounts(): HasMany
    {
        return $this->hasMany(FinancialAccount::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Branch timezone, falling back to the tenant region default. */
    public function effectiveTimezone(): string
    {
        return $this->timezone
            ?? $this->tenant?->getSetting('region.timezone')
            ?? config('app.timezone');
    }

    /** Branch currency, falling back to the tenant region default. */
    public function effectiveCurrency(): string
    {
        return $this->currency
            ?? $this->tenant?->getSetting('region.currency')
            ?? 'USD';
    }

    /** @return list<string> */
    public function serviceTypes(): array
    {
        return $this->service_types ?? [ServiceType::DineIn->value];
    }

    public function offersService(ServiceType $type): bool
    {
        return in_array($type->value, $this->serviceTypes(), true);
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings, $key, $default);
    }
}
