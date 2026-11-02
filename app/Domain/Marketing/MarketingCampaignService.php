<?php

namespace App\Domain\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Enums\CampaignStatus;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\Models\MarketingCampaignSpend;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Campaign CRUD, slugs and spend.
 *
 * Spend is always stored with its source, so a figure entered by hand can never be
 * presented as live ad-platform data further down the reporting chain.
 */
class MarketingCampaignService
{
    public function __construct(protected AuditLogger $audit) {}

    /** @param array<string, mixed> $data */
    public function create(array $data, ?User $actor = null): MarketingCampaign
    {
        $campaign = MarketingCampaign::create($this->prepare($data));

        $this->audit->log('marketing.campaign_created', $campaign, [
            'name' => $campaign->name,
            'channel' => $campaign->channel->value,
        ], $actor);

        return $campaign;
    }

    /** @param array<string, mixed> $data */
    public function update(MarketingCampaign $campaign, array $data, ?User $actor = null): MarketingCampaign
    {
        $before = ['name' => $campaign->name, 'status' => $campaign->status->value, 'channel' => $campaign->channel->value];

        $campaign->forceFill($this->prepare($data, $campaign))->save();

        $this->audit->logChange('marketing.campaign_updated', $campaign, $before, [
            'name' => $campaign->name,
            'status' => $campaign->status->value,
            'channel' => $campaign->channel->value,
        ], $actor);

        return $campaign;
    }

    public function delete(MarketingCampaign $campaign, ?User $actor = null): void
    {
        $this->audit->log('marketing.campaign_deleted', $campaign, ['name' => $campaign->name], $actor);

        $campaign->delete();
    }

    /** @param array<string, mixed> $data */
    public function recordSpend(MarketingCampaign $campaign, array $data, ?User $actor = null): MarketingCampaignSpend
    {
        $spend = MarketingCampaignSpend::create([
            'campaign_id' => $campaign->getKey(),
            'period_start' => $data['period_start'],
            'period_end' => $data['period_end'],
            'channel' => $campaign->channel->value,
            'amount' => $data['amount'],
            'currency' => strtoupper((string) $data['currency']),
            // Manual by definition: this screen is the hand-entry path.
            'source' => 'manual',
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit->log('marketing.campaign_spend_recorded', $campaign, [
            'amount' => $spend->amount,
            'currency' => $spend->currency,
            'source' => 'manual',
        ], $actor);

        return $spend;
    }

    public function slugFor(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'campaign';
        $slug = $base;
        $suffix = 2;

        while (MarketingCampaign::query()->where('slug', $slug)->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }

    /**
     * The UTM set for a campaign, filled in from the campaign's own fields so a link
     * is attributable without the operator retyping anything.
     *
     * @return array<string, string>
     */
    public function utmFor(MarketingCampaign $campaign): array
    {
        return array_filter([
            'utm_source' => $campaign->utm_source ?? $campaign->channel->value,
            'utm_medium' => $campaign->utm_medium ?? ($campaign->channel->isPaid() ? 'cpc' : 'referral'),
            'utm_campaign' => $campaign->utm_campaign ?? $campaign->slug,
            'utm_term' => $campaign->utm_term,
            'utm_content' => $campaign->utm_content,
        ], fn ($value) => $value !== null && $value !== '');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function prepare(array $data, ?MarketingCampaign $campaign = null): array
    {
        $name = trim((string) ($data['name'] ?? $campaign?->name ?? ''));

        return array_filter([
            'name' => $name,
            'slug' => $campaign?->slug ?? $this->slugFor($name),
            'objective' => $data['objective'] ?? $campaign?->objective?->value,
            'description' => $data['description'] ?? $campaign?->description,
            'channel' => $data['channel'] ?? $campaign?->channel?->value ?? 'other',
            'status' => $data['status'] ?? $campaign?->status?->value ?? CampaignStatus::Draft->value,
            'owner_id' => $data['owner_id'] ?? $campaign?->owner_id,
            'start_date' => $data['start_date'] ?? $campaign?->start_date,
            'end_date' => $data['end_date'] ?? $campaign?->end_date,
            'budget' => $data['budget'] ?? $campaign?->budget,
            'currency' => isset($data['currency']) ? strtoupper((string) $data['currency']) : $campaign?->currency,
            'target_country' => isset($data['target_country']) ? strtoupper((string) $data['target_country']) : $campaign?->target_country,
            'target_audience' => $data['target_audience'] ?? $campaign?->target_audience,
            'target_restaurant_category' => $data['target_restaurant_category'] ?? $campaign?->target_restaurant_category,
            'target_business_size' => $data['target_business_size'] ?? $campaign?->target_business_size,
            'target_plan_id' => $data['target_plan_id'] ?? $campaign?->target_plan_id,
            'landing_page_id' => $data['landing_page_id'] ?? $campaign?->landing_page_id,
            'utm_source' => $data['utm_source'] ?? $campaign?->utm_source,
            'utm_medium' => $data['utm_medium'] ?? $campaign?->utm_medium,
            'utm_campaign' => $data['utm_campaign'] ?? $campaign?->utm_campaign,
            'utm_term' => $data['utm_term'] ?? $campaign?->utm_term,
            'utm_content' => $data['utm_content'] ?? $campaign?->utm_content,
            'notes' => $data['notes'] ?? $campaign?->notes,
            'created_by' => $campaign?->created_by ?? $data['created_by'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');
    }

    /**
     * Calendar rows for the campaign screen.
     *
     * @return list<array<string, mixed>>
     */
    public function calendar(int $months = 6): array
    {
        $from = Carbon::now()->startOfMonth()->subMonths(2);
        $to = Carbon::now()->startOfMonth()->addMonths($months);

        return MarketingCampaign::query()
            ->where(fn ($query) => $query
                ->whereBetween('start_date', [$from->toDateString(), $to->toDateString()])
                ->orWhereBetween('end_date', [$from->toDateString(), $to->toDateString()])
                ->orWhere(fn ($inner) => $inner
                    ->where('start_date', '<=', $from->toDateString())
                    ->where('end_date', '>=', $to->toDateString())))
            ->orderBy('start_date')
            ->get()
            ->map(fn (MarketingCampaign $campaign) => [
                'id' => $campaign->getKey(),
                'name' => $campaign->name,
                'status' => $campaign->status->value,
                'channel' => $campaign->channel->value,
                'start_date' => $campaign->start_date?->toDateString(),
                'end_date' => $campaign->end_date?->toDateString(),
            ])
            ->all();
    }
}
