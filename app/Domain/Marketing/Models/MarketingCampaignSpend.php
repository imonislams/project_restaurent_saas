<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\MarketingChannel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A recorded cost for a campaign. The `source` column exists so the UI can state
 * plainly whether a figure was fetched from an ad platform or entered by hand —
 * manual spend is never presented as live ad data.
 */
class MarketingCampaignSpend extends Model
{
    protected $fillable = [
        'campaign_id',
        'period_start',
        'period_end',
        'channel',
        'amount',
        'currency',
        'source',
        'imported_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'channel' => MarketingChannel::class,
            'amount' => 'decimal:2',
            'imported_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    public function isManual(): bool
    {
        return $this->source === 'manual';
    }

    public function sourceLabel(): string
    {
        return match ($this->source) {
            'google_ads' => 'Google Ads API',
            'meta_ads' => 'Meta Ads API',
            default => 'Manually entered',
        };
    }
}
