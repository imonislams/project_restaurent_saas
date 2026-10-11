<?php

namespace App\Domain\Billing\Models;

use App\Domain\Billing\Enums\GatewayEnvironment;
use Illuminate\Database\Eloquent\Model;

/**
 * A platform payment gateway configuration. Multiple named configurations are
 * supported (e.g. several SSLCommerz accounts). Credentials are encrypted at
 * rest and never returned in full to the frontend.
 */
class PaymentGateway extends Model
{
    protected $fillable = [
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
            'environment' => GatewayEnvironment::class,
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

    /** Credential keys present, without exposing their values. */
    public function credentialKeys(): array
    {
        return array_keys($this->credentials ?? []);
    }

    public function displayName(): string
    {
        return $this->name ?: ucfirst($this->provider).' ('.$this->environment->value.')';
    }
}
