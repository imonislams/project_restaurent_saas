<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Communications\Models\Campaign;
use App\Domain\Communications\Models\EmailTemplate;
use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\Models\MarketingSegment;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Marketing email campaigns, sent through the per-recipient engine.
 *
 * A campaign targets marketing subscribers — people who opted in — rather than every
 * tenant on the platform. That is a deliberate change from the previous behaviour,
 * which mailed tenant owners directly: promotional mail needs a consent basis, and a
 * paying customer is not the same thing as a marketing subscriber.
 */
class CampaignController extends Controller
{
    public function __construct(protected EmailMarketingService $emails) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Marketing/Campaigns', [
            'campaigns' => Campaign::query()->latest('id')->limit(50)->get()->map(fn (Campaign $campaign) => [
                'id' => $campaign->getKey(),
                'name' => $campaign->name,
                'subject' => $campaign->subject,
                'body' => $campaign->body,
                'status' => $campaign->status,
                'segment_id' => $campaign->segment_id,
                'template_key' => $campaign->template_key,
                'from_name' => $campaign->from_name,
                'from_email' => $campaign->from_email,
                'reply_to' => $campaign->reply_to,
                'sent_at' => $campaign->sent_at?->toIso8601String(),
                'track_opens' => (bool) $campaign->track_opens,
                'track_clicks' => (bool) $campaign->track_clicks,
                'audience_size' => count($this->emails->recipients($campaign)),
                'stats' => $this->emails->stats($campaign),
                'recent' => $campaign->sends()->latest('id')->limit(10)->get()->map(fn ($send) => [
                    'email' => $send->email,
                    'status' => $send->status,
                    'error' => $send->error,
                    'opened' => $send->opened_at !== null,
                    'clicked' => $send->first_click_at !== null,
                ])->all(),
            ])->all(),
            'segments' => MarketingSegment::query()->orderBy('name')->get(['id', 'name'])->map(fn (MarketingSegment $segment) => [
                'value' => (string) $segment->getKey(),
                'label' => $segment->name,
            ])->values(),
            'templates' => EmailTemplate::query()->where('is_active', true)->orderBy('key')->get(['key', 'name'])->map(fn (EmailTemplate $template) => [
                'value' => $template->key,
                'label' => $template->name,
            ])->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $campaign = Campaign::create($this->validated($request) + [
            'status' => 'draft',
            'created_by' => $request->user()?->getKey(),
        ]);

        return back()->with('success', 'Campaign "'.$campaign->name.'" saved as a draft.');
    }

    public function update(Request $request, Campaign $campaign): RedirectResponse
    {
        $campaign->forceFill($this->validated($request))->save();

        return back()->with('success', 'Campaign updated.');
    }

    public function send(Request $request, Campaign $campaign): RedirectResponse
    {
        if (! in_array($campaign->status, ['draft', 'scheduled'], true)) {
            return back()->with('error', 'This campaign has already been sent.');
        }

        $result = $this->emails->queueCampaign($campaign, $request->user());

        if ($result['queued'] === 0) {
            return back()->with('error', 'Nothing was queued. Check the subscriber list, the suppression list and the campaign segment.');
        }

        return back()->with('success', $result['queued'].' message(s) queued'.($result['skipped'] > 0 ? ', '.$result['skipped'].' skipped' : '').'. Delivery is per recipient, so the report fills in as they go.');
    }

    public function test(Request $request, Campaign $campaign): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:150']]);

        $result = $this->emails->testSend($campaign, $data['email']);

        return $result['ok']
            ? back()->with('success', 'Test sent to '.$data['email'].'. It is not counted in the delivery report.')
            : back()->with('error', 'The test could not be sent: '.$result['error']);
    }

    public function destroy(Campaign $campaign): RedirectResponse
    {
        $campaign->delete();

        return back()->with('success', 'Campaign deleted.');
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:200000'],
            'segment_id' => ['nullable', 'integer', 'exists:marketing_segments,id'],
            'template_key' => ['nullable', 'string', 'max:60'],
            'from_name' => ['nullable', 'string', 'max:120'],
            'from_email' => ['nullable', 'email', 'max:150'],
            'reply_to' => ['nullable', 'email', 'max:150'],
            'track_opens' => ['nullable', 'boolean'],
            'track_clicks' => ['nullable', 'boolean'],
        ]);

        return $data + [
            'channel' => 'email',
            'track_opens' => (bool) ($data['track_opens'] ?? true),
            'track_clicks' => (bool) ($data['track_clicks'] ?? true),
        ];
    }
}
