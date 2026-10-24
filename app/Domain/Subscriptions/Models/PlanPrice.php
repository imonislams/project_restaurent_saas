<?php

namespace App\Domain\Subscriptions\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanPrice extends Model
{
    protected $fillable = [
        'plan_id',
        'currency',
        'interval',
        'price',
        'provider_prices',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'provider_prices' => 'array',
        ];
    }

    /**
     * A provider-specific price identifier for this plan/currency/interval,
     * e.g. priceId('paddle') => "pri_...".
     */
    public function providerPriceId(string $provider): ?string
    {
        $value = data_get($this->provider_prices, "{$provider}.price_id");

        return $value !== null ? (string) $value : null;
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
