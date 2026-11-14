<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\CampaignObjective;
use App\Domain\Marketing\Enums\CampaignStatus;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Subscriptions\Models\Plan;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A marketing campaign. Distinct from the tenant-blast `campaigns` table, which is
 * reused as the email campaign entity under Automation.
 */
class MarketingCampaign extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'objective',
        'description',
        'channel',
        'owner_id',
        'status',
        'start_date',
        'end_date',
        'budget',
        'currency',
        'target_country',
        'target_audience',
        'target_restaurant_category',
        'target_business_size',
        'target_plan_id',
        'landing_page_id',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'leads_count',
        'registrations_count',
        'conversions_count',
        'attributed_revenue',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'objective' => CampaignObjective::class,
            'channel' => MarketingChannel::class,
            'status' => CampaignStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'budget' => 'decimal:2',
            'attributed_revenue' => 'decimal:2',
            'leads_count' => 'integer',
            'registrations_count' => 'integer',
            'conversions_count' => 'integer',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function targetPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'target_plan_id');
    }

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(MarketingLandingPage::class, 'landing_page_id');
    }

    public function spends(): HasMany
    {
        return $this->hasMany(MarketingCampaignSpend::class, 'campaign_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(MarketingLead::class, 'campaign_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(MarketingEvent::class, 'campaign_id');
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

    /** Campaign spend in a single currency (spend may be recorded per currency). */
    public function spendFor(?string $currency = null): float
    {
        return (float) $this->spends()
            ->when($currency !== null, fn ($query) => $query->where('currency', $currency))
            ->sum('amount');
    }
}
