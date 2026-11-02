<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\Enums\LeadStatus;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A restaurant lead. On conversion, `tenant_id` links to the existing tenant record
 * so the customer is never duplicated.
 */
class MarketingLead extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'business_name',
        'restaurant_category',
        'country',
        'city',
        'branches_count',
        'current_software',
        'source',
        'channel',
        'campaign_id',
        'landing_page_id',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'visitor_id',
        'status',
        'score',
        'assigned_to',
        'assigned_at',
        'notes',
        'message',
        'follow_up_at',
        'last_contacted_at',
        'consent_marketing',
        'consent_at',
        'consent_ip_hash',
        'tenant_id',
        'converted_at',
        'lost_reason',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'source' => LeadSource::class,
            'channel' => MarketingChannel::class,
            'status' => LeadStatus::class,
            'score' => 'integer',
            'assigned_at' => 'datetime',
            'follow_up_at' => 'datetime',
            'last_contacted_at' => 'datetime',
            'consent_marketing' => 'boolean',
            'consent_at' => 'datetime',
            'converted_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(MarketingLandingPage::class, 'landing_page_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(MarketingLeadActivity::class, 'lead_id')->orderByDesc('occurred_at');
    }

    public function isConverted(): bool
    {
        return $this->converted_at !== null || $this->tenant_id !== null;
    }

    public function isOpen(): bool
    {
        return $this->status->isOpen();
    }

    /** @return array<string, string|null> */
    public function utm(): array
    {
        return [
            'utm_source' => $this->utm_source,
            'utm_medium' => $this->utm_medium,
            'utm_campaign' => $this->utm_campaign,
            'utm_term' => $this->utm_term,
            'utm_content' => $this->utm_content,
        ];
    }

    public function scopeOpen($query)
    {
        return $query->whereNotIn('status', [LeadStatus::Converted->value, LeadStatus::Lost->value]);
    }

    public function scopeAssignedTo($query, int $userId)
    {
        return $query->where('assigned_to', $userId);
    }
}
