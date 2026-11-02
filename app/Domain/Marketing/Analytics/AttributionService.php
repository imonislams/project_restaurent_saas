<?php

namespace App\Domain\Marketing\Analytics;

use App\Domain\Marketing\Enums\AttributionModel;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\Models\MarketingAttribution;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;

/**
 * Writes the first-touch and last-touch attribution for a customer.
 *
 * Two rules shape this:
 *
 *  1. **Once per customer per model.** A unique index on (tenant, model) makes a
 *     conversion impossible to count twice, however often the job runs.
 *  2. **A touchpoint outside the window does not qualify.** The window is recorded on
 *     the row, so a historical figure can still be explained later.
 *
 * A conversion with no qualifying touchpoint is attributed to `direct` and reported
 * explicitly rather than dropped, so the channel table always accounts for every
 * customer.
 */
class AttributionService
{
    public function __construct(protected PlatformSettings $settings) {}

    public function model(): AttributionModel
    {
        return AttributionModel::tryFrom((string) $this->settings->get('marketing.attribution_model', 'last_touch'))
            ?? AttributionModel::LastTouch;
    }

    public function windowDays(): int
    {
        return max(1, (int) $this->settings->get('marketing.attribution_window_days', 30));
    }

    /**
     * Attribute a customer. Idempotent: running it again changes nothing.
     *
     * @return int how many rows were created
     */
    public function attribute(Tenant $tenant, ?Carbon $convertedAt = null): int
    {
        $visitor = $this->visitorFor($tenant);
        $convertedAt ??= $tenant->created_at ?? Carbon::now();
        $window = $this->windowDays();
        $created = 0;

        foreach ([AttributionModel::FirstTouch, AttributionModel::LastTouch] as $model) {
            $touchpoint = $model === AttributionModel::FirstTouch
                ? $visitor?->first_seen_at
                : $visitor?->last_seen_at;

            // Outside the window: no attribution on this model, not a wrong one.
            $stale = $touchpoint !== null && $touchpoint->diffInDays($convertedAt) > $window;

            if ($stale) {
                $touchpoint = null;
            }

            $row = MarketingAttribution::query()->firstOrCreate(
                ['tenant_id' => $tenant->getKey(), 'model' => $model->value],
                [
                    'visitor_id' => $visitor?->visitor_id,
                    'campaign_id' => $this->campaignIdFor($tenant),
                    'landing_page_id' => $this->landingPageIdFor($tenant),
                    // A stale touchpoint earns nothing: the customer is reported as
                    // direct rather than credited to a campaign outside the window.
                    'channel' => $stale ? MarketingChannel::Direct->value : $this->channelFor($visitor, $model)->value,
                    'source' => $stale ? null : $this->field($visitor, $model, 'source'),
                    'medium' => $stale ? null : $this->field($visitor, $model, 'medium'),
                    'utm_campaign' => $stale ? null : $this->field($visitor, $model, 'campaign'),
                    'touchpoint_at' => $touchpoint,
                    'window_days' => $window,
                    'converted_at' => $convertedAt,
                ],
            );

            if ($row->wasRecentlyCreated) {
                $created++;
            }
        }

        $this->refreshValue($tenant);

        return $created;
    }

    /**
     * Recompute the recorded revenue for a customer's attributions from settled
     * invoices — the only source of truth for money.
     */
    public function refreshValue(Tenant $tenant): void
    {
        $settled = SubscriptionInvoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->where('status', 'paid')
            ->get(['amount', 'currency'])
            ->groupBy('currency')
            ->map(fn ($rows) => round((float) $rows->sum('amount'), 2));

        foreach (MarketingAttribution::query()->where('tenant_id', $tenant->getKey())->get() as $attribution) {
            $currency = $attribution->currency ?? $settled->keys()->first();
            $attribution->forceFill([
                'value' => $currency !== null ? ($settled[$currency] ?? 0.0) : null,
                'currency' => $currency,
            ])->save();
        }
    }

    /** @return int rows refreshed */
    public function refreshAll(): int
    {
        $tenants = MarketingAttribution::query()->distinct()->pluck('tenant_id');
        $refreshed = 0;

        foreach ($tenants as $tenantId) {
            $tenant = Tenant::query()->find($tenantId);

            if ($tenant !== null) {
                $this->refreshValue($tenant);
                $refreshed++;
            }
        }

        return $refreshed;
    }

    /**
     * The visitor behind a customer: their first tracked event, else the lead that
     * converted into them.
     */
    public function visitorFor(Tenant $tenant): ?MarketingVisitor
    {
        $visitorId = MarketingEvent::query()
            ->where('tenant_id', $tenant->getKey())
            ->whereNotNull('visitor_id')
            ->orderBy('occurred_at')
            ->value('visitor_id')
            ?? MarketingLead::query()->where('tenant_id', $tenant->getKey())->value('visitor_id');

        return is_string($visitorId)
            ? MarketingVisitor::query()->where('visitor_id', $visitorId)->first()
            : null;
    }

    protected function channelFor(?MarketingVisitor $visitor, AttributionModel $model): MarketingChannel
    {
        if ($visitor === null) {
            // No visit on record: reported as direct rather than silently dropped.
            return MarketingChannel::Direct;
        }

        return $visitor->channel ?? MarketingChannel::Direct;
    }

    protected function field(?MarketingVisitor $visitor, AttributionModel $model, string $key): ?string
    {
        if ($visitor === null) {
            return null;
        }

        $touch = $model === AttributionModel::FirstTouch ? $visitor->firstTouch() : $visitor->lastTouch();

        return $touch[$key] ?? null;
    }

    protected function campaignIdFor(Tenant $tenant): ?int
    {
        $utmCampaign = MarketingLead::query()->where('tenant_id', $tenant->getKey())->value('utm_campaign');

        return is_string($utmCampaign) && $utmCampaign !== ''
            ? MarketingLead::query()->where('tenant_id', $tenant->getKey())->value('campaign_id')
            : null;
    }

    protected function landingPageIdFor(Tenant $tenant): ?int
    {
        return MarketingLead::query()->where('tenant_id', $tenant->getKey())->value('landing_page_id');
    }
}
