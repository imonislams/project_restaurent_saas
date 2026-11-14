<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Communications\Models\Campaign;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One recipient's row in a marketing send. The unique index on
 * (campaign_id, email) makes "one send per recipient per campaign" a database
 * guarantee rather than a convention.
 */
class MarketingEmailSend extends Model
{
    protected $fillable = [
        'campaign_id',
        'lead_id',
        'subscriber_id',
        'tenant_id',
        'email',
        'token',
        'status',
        'sent_at',
        'delivered_at',
        'opened_at',
        'first_click_at',
        'bounced_at',
        'failed_at',
        'unsubscribed_at',
        'click_count',
        'error',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'opened_at' => 'datetime',
            'first_click_at' => 'datetime',
            'bounced_at' => 'datetime',
            'failed_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
            'click_count' => 'integer',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(MarketingLead::class, 'lead_id');
    }

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(MarketingSubscriber::class, 'subscriber_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(MarketingEmailClick::class, 'send_id');
    }

    public function markOpened(): bool
    {
        if ($this->opened_at !== null) {
            return false;
        }

        $this->forceFill(['opened_at' => Carbon::now(), 'status' => $this->status === 'delivered' ? 'opened' : $this->status])->save();

        return true;
    }

    public function markClicked(): bool
    {
        $first = $this->first_click_at === null;

        $this->forceFill([
            'first_click_at' => $this->first_click_at ?? Carbon::now(),
            'click_count' => $this->click_count + 1,
            'status' => 'clicked',
        ])->save();

        return $first;
    }

    public function scopeForCampaign($query, int $campaignId)
    {
        return $query->where('campaign_id', $campaignId);
    }
}
