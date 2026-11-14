<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Marketing\Enums\CampaignObjective;
use App\Domain\Marketing\Enums\CampaignStatus;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\MarketingCampaignService;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\Models\MarketingLandingPage;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\Models\Plan;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Marketing campaigns, their UTM link and their spend.
 *
 * Counters on the card are derived from the lead and attribution tables, so a campaign
 * never reports a number it did not cause.
 */
class CampaignController extends Controller
{
    public function __construct(protected MarketingCampaignService $campaigns) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => (string) $request->string('status'),
            'channel' => (string) $request->string('channel'),
            'view' => $request->string('view')->toString() === 'calendar' ? 'calendar' : 'list',
        ];

        $query = MarketingCampaign::query()
            ->with(['owner:id,name', 'landingPage:id,slug,name'])
            ->when($filters['search'] !== '', fn ($q) => $q->where('name', 'like', '%'.$filters['search'].'%'))
            ->when($filters['status'] !== '', fn ($q) => $q->where('status', $filters['status']))
            ->when($filters['channel'] !== '', fn ($q) => $q->where('channel', $filters['channel']));

        return Inertia::render('Platform/Marketing/Campaigns/Index', [
            'campaigns' => $query->latest('id')->paginate(25)->withQueryString()->through(function (MarketingCampaign $campaign) {
                $leads = $campaign->leads()->count();
                $converted = $campaign->leads()->whereNotNull('converted_at')->count();

                return [
                    'id' => $campaign->getKey(),
                    'name' => $campaign->name,
                    'slug' => $campaign->slug,
                    'channel' => $campaign->channel->value,
                    'channel_label' => $campaign->channel->label(),
                    'objective' => $campaign->objective?->value,
                    'status' => $campaign->status->value,
                    'status_label' => $campaign->status->label(),
                    'start_date' => $campaign->start_date?->toDateString(),
                    'end_date' => $campaign->end_date?->toDateString(),
                    'budget' => $campaign->budget !== null ? (float) $campaign->budget : null,
                    'currency' => $campaign->currency,
                    'spend' => $campaign->spendFor($campaign->currency),
                    'manual_spend' => $campaign->spends()->where('source', 'manual')->sum('amount') > 0,
                    'owner' => $campaign->owner?->name,
                    'landing_page' => $campaign->landingPage?->slug,
                    'utm' => $campaign->utm(),
                    'leads' => $leads,
                    'converted' => $converted,
                    'conversion_rate' => $leads > 0 ? round($converted / $leads * 100, 1) : 0.0,
                    'attributed_revenue' => (float) $campaign->attributed_revenue,
                    'notes' => $campaign->notes,
                    'description' => $campaign->description,
                    'target_country' => $campaign->target_country,
                    'target_audience' => $campaign->target_audience,
                    'target_restaurant_category' => $campaign->target_restaurant_category,
                    'target_business_size' => $campaign->target_business_size,
                    'target_plan_id' => $campaign->target_plan_id,
                    'landing_page_id' => $campaign->landing_page_id,
                    'owner_id' => $campaign->owner_id,
                ];
            }),
            'calendar' => $this->campaigns->calendar(),
            'filters' => $filters,
            'options' => [
                'channels' => collect(MarketingChannel::cases())->map(fn (MarketingChannel $channel) => [
                    'value' => $channel->value,
                    'label' => $channel->label(),
                ])->values(),
                'statuses' => collect(CampaignStatus::cases())->map(fn (CampaignStatus $status) => [
                    'value' => $status->value,
                    'label' => $status->label(),
                ])->values(),
                'objectives' => collect(CampaignObjective::cases())->map(fn (CampaignObjective $objective) => [
                    'value' => $objective->value,
                    'label' => $objective->label(),
                ])->values(),
                'plans' => Plan::query()->orderBy('name')->get(['id', 'name'])->map(fn (Plan $plan) => [
                    'value' => (string) $plan->getKey(),
                    'label' => $plan->name,
                ])->values(),
                'landing_pages' => MarketingLandingPage::query()->orderBy('name')->get(['id', 'name', 'slug'])->map(fn (MarketingLandingPage $page) => [
                    'value' => (string) $page->getKey(),
                    'label' => $page->name,
                ])->values(),
                'owners' => User::query()->where('is_platform_admin', true)->orderBy('name')->get(['id', 'name'])->map(fn (User $user) => [
                    'value' => (string) $user->getKey(),
                    'label' => $user->name,
                ])->values(),
            ],
            'currencies' => app(PlatformSettings::class)->enabledCurrencies(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $campaign = $this->campaigns->create($this->validated($request), $request->user());

        return back()->with('success', 'Campaign "'.$campaign->name.'" created as a draft.');
    }

    public function update(Request $request, MarketingCampaign $campaign): RedirectResponse
    {
        $this->campaigns->update($campaign, $this->validated($request, $campaign), $request->user());

        return back()->with('success', 'Campaign updated.');
    }

    public function destroy(Request $request, MarketingCampaign $campaign): RedirectResponse
    {
        $this->campaigns->delete($campaign, $request->user());

        return back()->with('success', 'Campaign deleted. Its leads keep their history but lose the campaign link.');
    }

    public function spend(Request $request, MarketingCampaign $campaign): RedirectResponse
    {
        $data = $request->validate([
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $data['currency'] = strtoupper($data['currency']);

        $this->campaigns->recordSpend($campaign, $data, $request->user());

        return back()->with('success', 'Spend recorded as manually entered. Every CAC and ROAS that uses it says so.');
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request, ?MarketingCampaign $campaign = null): array
    {
        $data = $request->validate([
            'name' => [$campaign === null ? 'required' : 'nullable', 'string', 'max:150'],
            'objective' => ['nullable', 'string', 'in:'.implode(',', CampaignObjective::values())],
            'description' => ['nullable', 'string', 'max:2000'],
            'channel' => ['required', 'string', 'in:'.implode(',', MarketingChannel::values())],
            'status' => ['required', 'string', 'in:'.implode(',', CampaignStatus::values())],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'target_country' => ['nullable', 'string', 'size:2'],
            'target_audience' => ['nullable', 'string', 'max:255'],
            'target_restaurant_category' => ['nullable', 'string', 'max:60'],
            'target_business_size' => ['nullable', 'string', 'max:40'],
            'target_plan_id' => ['nullable', 'integer', 'exists:plans,id'],
            'landing_page_id' => ['nullable', 'integer', 'exists:marketing_landing_pages,id'],
            'utm_source' => ['nullable', 'string', 'max:120'],
            'utm_medium' => ['nullable', 'string', 'max:120'],
            'utm_campaign' => ['nullable', 'string', 'max:120'],
            'utm_term' => ['nullable', 'string', 'max:120'],
            'utm_content' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($campaign === null) {
            $data['created_by'] = $request->user()?->getKey();
        }

        return $data;
    }
}
