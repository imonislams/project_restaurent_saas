<?php

namespace App\Domain\PaymentGateways\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

/**
 * A tenant's configured payment gateway. Several may be enabled at once; one is
 * the default. Credentials are encrypted at rest and never returned in full to
 * the frontend.
 */
class TenantGateway extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'provider',
        'environment',
        'is_enabled',
        'is_default',
        'sort_order',
        'supported_currencies',
        'credentials',
        'settings',
        'health_status',
        'last_ok_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
            'supported_currencies' => 'array',
            'credentials' => 'encrypted:array',
            'settings' => 'array',
            'last_ok_at' => 'datetime',
        ];
    }

    public function supports(string $currency): bool
    {
        $currencies = $this->supported_currencies ?? [];

        return $currencies === [] || in_array(strtoupper($currency), array_map('strtoupper', $currencies), true);
    }

    /** @return list<string> */
    public function credentialKeys(): array
    {
        return array_keys(array_filter($this->credentials ?? [], fn ($value) => $value !== null && $value !== ''));
    }

    public function displayName(): string
    {
        return $this->name ?: ucfirst(str_replace('_', ' ', $this->provider));
    }
}
