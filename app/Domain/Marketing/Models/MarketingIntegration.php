<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\IntegrationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One configured external provider. Credentials are encrypted at rest and only
 * their key names are ever exposed — the same contract as PaymentGateway.
 */
class MarketingIntegration extends Model
{
    protected $fillable = [
        'provider',
        'name',
        'environment',
        'is_enabled',
        'credentials',
        'settings',
        'status',
        'health_status',
        'last_ok_at',
        'last_error_at',
        'last_synced_at',
        'last_error',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'credentials' => 'encrypted:array',
            'settings' => 'array',
            'status' => IntegrationStatus::class,
            'last_ok_at' => 'datetime',
            'last_error_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function syncLogs(): HasMany
    {
        return $this->hasMany(MarketingSyncLog::class, 'integration_id');
    }

    /**
     * The credential key names present on this integration. Values are never
     * returned, not even masked.
     *
     * @return list<string>
     */
    public function credentialKeys(): array
    {
        return array_keys(is_array($this->credentials) ? $this->credentials : []);
    }

    public function isConfigured(): bool
    {
        return $this->status !== IntegrationStatus::NotConfigured;
    }

    /** Whether the integration may currently be used for dispatch or sync. */
    public function isOperational(): bool
    {
        return $this->is_enabled && $this->status === IntegrationStatus::Connected;
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeForProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }
}
