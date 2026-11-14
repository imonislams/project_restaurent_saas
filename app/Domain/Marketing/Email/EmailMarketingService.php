<?php

namespace App\Domain\Marketing\Email;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Communications\EmailTemplateService;
use App\Domain\Communications\Models\Campaign;
use App\Domain\Marketing\Models\MarketingEmailClick;
use App\Domain\Marketing\Models\MarketingEmailSend;
use App\Domain\Marketing\Models\MarketingEmailSuppression;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingSegment;
use App\Domain\Marketing\Models\MarketingSubscriber;
use App\Jobs\SendMarketingEmailJob;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Promotional email: audience building, per-recipient delivery and tracking.
 *
 * Three rules are enforced here rather than trusted to callers:
 *
 *  1. **One row per recipient per campaign** — the database's unique index makes a
 *     re-run impossible to send twice.
 *  2. **Suppression, subscriber status and consent are checked at send time**, so a
 *     replayed delivery never reaches an address that has since opted out. Note that
 *     delivery is **synchronous** (see queueCampaign): there is no queue window for an
 *     unsubscribe to interrupt a send that is already in progress, so an opt-out only
 *     applies to mail not yet handed to the transport.
 *  3. **Transactional mail is untouched** — invoices, verification and password resets
 *     never pass through this service, so a marketing unsubscribe cannot silence them.
 */
class EmailMarketingService
{
    public function __construct(
        protected EmailTemplateService $templates,
        protected AuditLogger $audit,
    ) {}

    /**
     * The audience for a campaign: subscribed addresses, narrowed by its segment.
     *
     * @return list<array{email: string, lead_id: ?int, subscriber_id: ?int, tenant_id: ?int}>
     */
    public function recipients(Campaign $campaign): array
    {
        $query = MarketingSubscriber::query()->subscribed();

        $segment = $campaign->segment_id !== null
            ? MarketingSegment::query()->find($campaign->segment_id)
            : null;

        $rules = $segment?->rules ?? [];

        if (! empty($rules['lead_status'])) {
            $query->whereIn('lead_id', MarketingLead::query()->where('status', $rules['lead_status'])->select('id'));
        }

        if (! empty($rules['lead_source'])) {
            $query->whereIn('lead_id', MarketingLead::query()->where('source', $rules['lead_source'])->select('id'));
        }

        if (! empty($rules['country'])) {
            $query->whereIn('lead_id', MarketingLead::query()->where('country', $rules['country'])->select('id'));
        }

        $suppressed = MarketingEmailSuppression::query()->pluck('email')->map(fn ($email) => strtolower((string) $email))->all();

        return $query
            ->get(['email', 'lead_id', 'tenant_id'])
            ->map(fn (MarketingSubscriber $subscriber) => [
                'email' => strtolower($subscriber->email),
                'lead_id' => $subscriber->lead_id,
                'subscriber_id' => $subscriber->getKey(),
                'tenant_id' => $subscriber->tenant_id,
            ])
            ->reject(fn (array $row) => in_array($row['email'], $suppressed, true))
            ->unique('email')
            ->values()
            ->all();
    }

    /**
     * Create one delivery row per recipient and queue it.
     *
     * @return array{queued: int, skipped: int}
     */
    public function queueCampaign(Campaign $campaign, ?User $actor = null): array
    {
        $queued = 0;
        $skipped = 0;
        $recipients = $this->recipients($campaign);

        // Counters are set *before* queueing. A synchronous queue runs each job inside
        // the dispatch below, and a later write here would otherwise overwrite the
        // "sent" state those jobs had already committed.
        $campaign->forceFill([
            'status' => 'sending',
            'total_recipients' => $campaign->total_recipients + count($recipients),
            'sent_at' => null,
        ])->save();

        foreach ($recipients as $recipient) {
            if (! $this->mayEmail($recipient['email'])['ok']) {
                $skipped++;

                continue;
            }

            $send = MarketingEmailSend::query()->firstOrCreate(
                ['campaign_id' => $campaign->getKey(), 'email' => $recipient['email']],
                [
                    'lead_id' => $recipient['lead_id'],
                    'subscriber_id' => $recipient['subscriber_id'],
                    'tenant_id' => $recipient['tenant_id'],
                    'token' => (string) Str::uuid(),
                    'status' => 'pending',
                ],
            );

            if (! $send->wasRecentlyCreated) {
                // Already delivered or in flight: never re-send.
                $skipped++;

                continue;
            }

            // Mail must go out whether or not a queue worker is running, so each
            // recipient is delivered on the synchronous connection.
            SendMarketingEmailJob::dispatchSync($send->getKey());
            $queued++;
        }

        if ($queued === 0) {
            $campaign->forceFill(['status' => 'draft'])->save();
        }

        $this->audit->log('marketing.email_campaign_sent', $campaign, [
            'queued' => $queued,
            'skipped' => $skipped,
        ], $actor);

        return ['queued' => $queued, 'skipped' => $skipped];
    }

    /**
     * Send one already-created delivery row.
     *
     * @return array{ok: bool, skipped: ?string, error: ?string}
     */
    public function send(MarketingEmailSend $send): array
    {
        // Terminal states are never retried: the unique row is the idempotency key.
        if (in_array($send->status, ['sent', 'delivered', 'opened', 'clicked', 'bounced'], true)) {
            return ['ok' => true, 'skipped' => 'already sent', 'error' => null];
        }

        $gate = $this->mayEmail($send->email);

        if (! $gate['ok']) {
            $send->forceFill(['status' => 'failed', 'failed_at' => Carbon::now(), 'error' => $gate['reason']])->save();
            $this->bump($send, 'failed');

            return ['ok' => false, 'skipped' => $gate['reason'], 'error' => null];
        }

        $campaign = $send->campaign;

        if ($campaign === null) {
            return ['ok' => false, 'skipped' => null, 'error' => 'The campaign no longer exists.'];
        }

        $html = $this->render($campaign, $send);
        $subject = $this->subject($campaign);

        try {
            Mail::html($html, function ($message) use ($send, $subject, $campaign) {
                $message->to($send->email)->subject($subject);

                if ($campaign->from_email) {
                    $message->from($campaign->from_email, $campaign->from_name ?: null);
                }

                if ($campaign->reply_to) {
                    $message->replyTo($campaign->reply_to);
                }

                // One click, no login, and mail clients show it natively.
                $message->getHeaders()->addTextHeader('List-Unsubscribe', '<'.$this->unsubscribeUrl($send).'>');
                $message->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
            });
        } catch (\Throwable $e) {
            $send->forceFill(['status' => 'failed', 'failed_at' => Carbon::now(), 'error' => mb_substr($e->getMessage(), 0, 2000)])->save();
            $this->bump($send, 'failed');

            return ['ok' => false, 'skipped' => null, 'error' => $e->getMessage()];
        }

        $send->forceFill(['status' => 'sent', 'sent_at' => Carbon::now(), 'error' => null])->save();
        $this->bump($send, 'sent');

        return ['ok' => true, 'skipped' => null, 'error' => null];
    }

    /**
     * Send a preview to one address, without creating a delivery row.
     *
     * An operator testing their own campaign must not pollute the delivery report, and
     * must not be blocked by consent they have not given.
     *
     * @return array{ok: bool, error: ?string}
     */
    public function testSend(Campaign $campaign, string $email): array
    {
        $token = (string) Str::uuid();

        $html = $this->render($campaign, new MarketingEmailSend([
            'campaign_id' => $campaign->getKey(),
            'email' => $email,
            'token' => $token,
            'status' => 'pending',
        ]));

        try {
            Mail::html($html, function ($message) use ($campaign, $email) {
                $message->to($email)->subject('[Test] '.$this->subject($campaign));
            });
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }

        return ['ok' => true, 'error' => null];
    }

    /**
     * Whether this address may receive promotional mail right now.
     *
     * @return array{ok: bool, reason: ?string}
     */
    public function mayEmail(string $email): array
    {
        $email = strtolower(trim($email));

        if ($email === '') {
            return ['ok' => false, 'reason' => 'No address on the recipient.'];
        }

        if (MarketingEmailSuppression::query()->where('email', $email)->exists()) {
            return ['ok' => false, 'reason' => 'This address is on the suppression list.'];
        }

        $subscriber = MarketingSubscriber::query()->where('email', $email)->first();

        if ($subscriber !== null && $subscriber->status !== 'subscribed') {
            return ['ok' => false, 'reason' => 'The subscriber status is '.$subscriber->status.'.'];
        }

        if ($subscriber === null) {
            $lead = MarketingLead::query()->whereRaw('lower(email) = ?', [$email])->latest('id')->first();

            if ($lead !== null && ! $lead->consent_marketing) {
                return ['ok' => false, 'reason' => 'This lead has not granted marketing consent.'];
            }

            if ($lead === null) {
                return ['ok' => false, 'reason' => 'This address is not a subscriber, so there is no consent for promotional mail.'];
            }
        }

        return ['ok' => true, 'reason' => null];
    }

    public function unsubscribe(string $token, ?string $reason = null): ?MarketingEmailSend
    {
        $send = MarketingEmailSend::query()->where('token', $token)->first();

        if ($send === null) {
            return null;
        }

        $email = strtolower($send->email);

        MarketingEmailSuppression::query()->firstOrCreate(
            ['email' => $email],
            ['reason' => 'unsubscribe', 'added_by' => null],
        );

        MarketingSubscriber::query()->where('email', $email)->update([
            'status' => 'unsubscribed',
            'unsubscribed_at' => Carbon::now(),
            'unsubscribe_reason' => $reason,
        ]);

        $send->forceFill(['unsubscribed_at' => Carbon::now(), 'status' => 'unsubscribed'])->save();

        if ($send->campaign !== null) {
            $send->campaign->forceFill(['unsubscribe_count' => $send->campaign->unsubscribe_count + 1])->save();
        }

        return $send;
    }

    public function recordOpen(MarketingEmailSend $send): bool
    {
        if ($send->opened_at !== null) {
            return false;
        }

        $send->forceFill([
            'opened_at' => Carbon::now(),
            'status' => in_array($send->status, ['sent', 'delivered'], true) ? 'opened' : $send->status,
        ])->save();

        $send->campaign?->forceFill(['open_count' => $send->campaign->open_count + 1])->save();

        return true;
    }

    public function recordClick(MarketingEmailSend $send, string $url): void
    {
        MarketingEmailClick::create([
            'send_id' => $send->getKey(),
            'url' => mb_substr($url, 0, 1000),
        ]);

        $first = $send->first_click_at === null;

        $send->forceFill([
            'first_click_at' => $send->first_click_at ?? Carbon::now(),
            'click_count' => $send->click_count + 1,
            'status' => 'clicked',
        ])->save();

        if ($first) {
            $send->campaign?->forceFill(['click_count' => $send->campaign->click_count + 1])->save();
        }
    }

    /**
     * Delivery report for a campaign.
     *
     * @return array<string, mixed>
     */
    public function stats(Campaign $campaign): array
    {
        $sends = $campaign->sends();

        $sent = (clone $sends)->whereIn('status', ['sent', 'delivered', 'opened', 'clicked'])->count();
        $failed = (clone $sends)->where('status', 'failed')->count();
        $opened = (clone $sends)->whereNotNull('opened_at')->count();
        $clicked = (clone $sends)->whereNotNull('first_click_at')->count();
        $unsubscribed = (clone $sends)->whereNotNull('unsubscribed_at')->count();
        $pending = (clone $sends)->where('status', 'pending')->count();

        return [
            'total' => (clone $sends)->count(),
            'sent' => $sent,
            'failed' => $failed,
            'pending' => $pending,
            'opened' => $opened,
            'clicked' => $clicked,
            'unsubscribed' => $unsubscribed,
            'open_rate' => $sent > 0 ? round($opened / $sent * 100, 1) : 0.0,
            'click_rate' => $sent > 0 ? round($clicked / $sent * 100, 1) : 0.0,
            // Stated plainly rather than reported as zero: SMTP cannot tell us.
            'bounces' => null,
            'bounces_reason' => 'Bounce and complaint data needs an email provider with webhooks. A raw SMTP path reports only immediate transport rejections, which are counted under failed.',
        ];
    }

    public function unsubscribeUrl(MarketingEmailSend $send): string
    {
        return url('/m/u/'.$send->token);
    }

    public function openUrl(MarketingEmailSend $send): string
    {
        return url('/m/o/'.$send->token.'.gif');
    }

    protected function subject(Campaign $campaign): string
    {
        return (string) ($campaign->subject ?: $campaign->name);
    }

    /**
     * Render the body, then add the open pixel and rewrite links for click tracking.
     */
    protected function render(Campaign $campaign, MarketingEmailSend $send): string
    {
        $body = (string) $campaign->body;

        if ($campaign->template_key) {
            $rendered = $this->templates->render((string) $campaign->template_key, [
                'email' => $send->email,
                'name' => $send->subscriber?->name ?? $send->lead?->name ?? '',
                'unsubscribe_url' => $this->unsubscribeUrl($send),
                'campaign' => $campaign->name,
            ]);

            if ($rendered !== null) {
                $body = $rendered['body'];
            }
        }

        if ($campaign->track_clicks) {
            $body = $this->rewriteLinks($body, $send);
        }

        if ($campaign->track_opens) {
            $pixel = '<img src="'.$this->openUrl($send).'" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />';
            $body .= $pixel;
        }

        return $body;
    }

    protected function rewriteLinks(string $html, MarketingEmailSend $send): string
    {
        return (string) preg_replace_callback(
            '/(href=["\'])(https?:\/\/[^"\']+)(["\'])/i',
            function (array $matches) use ($send) {
                // The unsubscribe link must stay direct: wrapping it in the click
                // tracker would still work, but it would look like tracking.
                if (str_contains($matches[2], '/m/u/')) {
                    return $matches[0];
                }

                return $matches[1].url('/m/c/'.$send->token).'?u='.rawurlencode($matches[2]).$matches[3];
            },
            $html,
        );
    }

    protected function bump(MarketingEmailSend $send, string $outcome): void
    {
        $campaign = $send->campaign;

        if ($campaign === null) {
            return;
        }

        $campaign->forceFill([
            'sent_count' => $campaign->sent_count + ($outcome === 'sent' ? 1 : 0),
            'failed_count' => $campaign->failed_count + ($outcome === 'failed' ? 1 : 0),
        ])->save();

        // Claim completion only when every queued row has actually finished.
        $finished = $campaign->sent_count + $campaign->failed_count;
        $remaining = $campaign->sends()->where('status', 'pending')->count();

        if ($remaining === 0 && $finished > 0) {
            $campaign->forceFill([
                'status' => 'sent',
                'sent_at' => $campaign->sent_at ?? Carbon::now(),
                'recipients_count' => $campaign->sent_count,
            ])->save();
        }
    }
}
