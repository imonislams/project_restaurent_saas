<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\AttributionModel;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One attribution per customer per model, enforced by a unique index so a
 * conversion can never be counted twice.
 */
class MarketingAttribution extends Model
{
    protected $fillable = [
        'visitor_id',
        'user_id',
        'tenant_id',
        'campaign_id',
        'landing_page_id',
        'model',
        'channel',
        'source',
        'medium',
        'utm_campaign',
        'touchpoint_at',
        'window_days',
        'value',
        'currency',
        'converted_at',
    ];

    protected function casts(): array
    {
        return [
            'model' => AttributionModel::class,
            'channel' => MarketingChannel::class,
            'touchpoint_at' => 'datetime',
            'converted_at' => 'datetime',
            'window_days' => 'integer',
            'value' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(MarketingLandingPage::class, 'landing_page_id');
    }
}
