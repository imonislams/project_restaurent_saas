<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\ConsentCategory;
use App\Domain\Marketing\Enums\DeviceCategory;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The internal event ledger. Every event carries a stable event_id, which is both
 * the dedupe key here and the shared key that lets Meta deduplicate browser and
 * server delivery of the same action.
 */
class MarketingEvent extends Model
{
    protected $fillable = [
        'event_id',
        'name',
        'category',
        'source',
        'visitor_id',
        'user_id',
        'tenant_id',
        'lead_id',
        'campaign_id',
        'landing_page_id',
        'occurred_at',
        'path',
        'url',
        'referrer',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'channel',
        'device',
        'country',
        'value',
        'currency',
        'properties',
    ];

    protected function casts(): array
    {
        return [
            'name' => EventName::class,
            'category' => ConsentCategory::class,
            'device' => DeviceCategory::class,
            'channel' => MarketingChannel::class,
            'occurred_at' => 'datetime',
            'value' => 'decimal:2',
            'properties' => 'array',
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

    public function lead(): BelongsTo
    {
        return $this->belongsTo(MarketingLead::class, 'lead_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(MarketingLandingPage::class, 'landing_page_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(MarketingEventDelivery::class, 'marketing_event_id');
    }
}
