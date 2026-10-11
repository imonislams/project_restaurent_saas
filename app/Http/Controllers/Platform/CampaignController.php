<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Communications\CampaignService;
use App\Domain\Communications\Models\Campaign;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreCampaignRequest;
use App\Jobs\SendCampaignJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    public function __construct(
        protected CampaignService $campaigns,
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        $plans = Plan::query()->orderBy('sort_order')->get(['id', 'name', 'slug']);

        return Inertia::render('Platform/Marketing/Campaigns', [
            'campaigns' => Campaign::query()->latest('id')->paginate(25)->through(fn (Campaign $campaign) => [
                'id' => $campaign->getKey(),
                'name' => $campaign->name,
                'subject' => $campaign->subject,
                'body' => $campaign->body,
                'audience' => $campaign->audience ?? [],
                'status' => $campaign->status,
                'recipients_count' => $campaign->recipients_count,
                'sent_at' => $campaign->sent_at?->toIso8601String(),
                'audience_size' => count($this->campaigns->audienceEmails($campaign->audience ?? [])),
            ]),
            'options' => [
                'statuses' => collect(TenantStatus::cases())->map(fn (TenantStatus $status) => ['value' => $status->value, 'label' => $status->label()])->all(),
                'plans' => $plans->map(fn (Plan $plan) => ['value' => $plan->slug, 'label' => $plan->name])->all(),
            ],
        ]);
    }

    public function store(StoreCampaignRequest $request): RedirectResponse
    {
        $campaign = Campaign::create($request->validated() + ['created_by' => $request->user()->getKey(), 'status' => 'draft']);

        $this->audit->log('platform.campaign_created', $campaign, ['name' => $campaign->name], $request->user());

        return back()->with('success', 'Campaign saved as a draft.');
    }

    public function update(StoreCampaignRequest $request, Campaign $campaign): RedirectResponse
    {
        $campaign->update($request->validated());

        $this->audit->log('platform.campaign_updated', $campaign, ['name' => $campaign->name], $request->user());

        return back()->with('success', 'Campaign updated.');
    }

    public function send(Request $request, Campaign $campaign): RedirectResponse
    {
        abort_if($campaign->status === 'sent', 422, 'This campaign has already been sent.');

        $campaign->forceFill(['status' => 'queued'])->save();

        SendCampaignJob::dispatch($campaign->getKey());

        $this->audit->log('platform.campaign_queued', $campaign, [
            'name' => $campaign->name,
            'audience' => $campaign->audience,
        ], $request->user());

        return back()->with('success', 'Campaign queued for delivery.');
    }

    public function destroy(Request $request, Campaign $campaign): RedirectResponse
    {
        $this->audit->log('platform.campaign_deleted', $campaign, ['name' => $campaign->name], $request->user());
        $campaign->delete();

        return back()->with('success', 'Campaign deleted.');
    }
}
