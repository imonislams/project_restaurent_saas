<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\Enums\LeadStatus;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingLeadActivity;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The lead engine behind the marketing CRM.
 *
 * The contact form used to validate and flash a thank-you without storing anything, so
 * every enquiry was lost. Capture now persists the lead, inherits its attribution from
 * the visitor record (which is where the campaign context already lives), and
 * deduplicates so a person who enquires twice has one record with one timeline.
 */
class LeadService
{
    public function __construct(protected MarketingEventService $events) {}

    /**
     * Create or update a lead from a public form submission.
     *
     * @param  array<string, mixed>  $data
     * @return array{lead: MarketingLead, created: bool}
     */
    public function capture(array $data, ?Request $request = null, LeadSource $source = LeadSource::ContactForm): array
    {
        $email = $this->normaliseEmail($data['email'] ?? null);
        $phone = $this->normalisePhone($data['phone'] ?? null);

        $visitorId = $request?->cookie(VisitorTracker::COOKIE);
        $visitor = is_string($visitorId)
            ? MarketingVisitor::query()->where('visitor_id', $visitorId)->first()
            : null;

        $utm = $this->attribution($data, $visitor);
        $campaign = $this->campaignFor($utm['utm_campaign'], $utm['utm_term']);

        $attributes = array_filter([
            'name' => $data['name'] ?? null,
            'email' => $email,
            'phone' => $phone,
            'business_name' => $data['business_name'] ?? ($data['restaurant_name'] ?? null),
            'restaurant_category' => $data['restaurant_category'] ?? ($data['venue_type'] ?? null),
            'country' => isset($data['country']) ? strtoupper((string) $data['country']) : ($visitor?->country),
            'city' => $data['city'] ?? null,
            'branches_count' => $data['branches_count'] ?? null,
            'current_software' => $data['current_software'] ?? null,
            'message' => $data['message'] ?? null,
            'source' => $source->value,
            'channel' => $visitor?->channel?->value ?? MarketingChannel::Direct->value,
            'campaign_id' => $campaign?->getKey(),
            'visitor_id' => $visitor?->visitor_id,
            'utm_source' => $utm['utm_source'],
            'utm_medium' => $utm['utm_medium'],
            'utm_campaign' => $utm['utm_campaign'],
            'utm_term' => $utm['utm_term'],
            'utm_content' => $utm['utm_content'],
            'consent_marketing' => (bool) ($data['consent_marketing'] ?? false),
            'consent_at' => ($data['consent_marketing'] ?? false) ? Carbon::now() : null,
            'consent_ip_hash' => ($data['consent_marketing'] ?? false) ? Support\IpHasher::fromRequest($request ?? Request::create('/')) : null,
        ], fn ($value) => $value !== null && $value !== '');

        return DB::transaction(function () use ($attributes, $email, $phone, $source) {
            $existing = $this->findDuplicate($email, $phone);

            if ($existing !== null) {
                // A repeat enquiry enriches the record rather than creating a second one;
                // nothing already captured is blanked out.
                $existing->fill($attributes)->save();

                $this->activity($existing, 'note', 'New enquiry from '.$source->label(), (string) ($attributes['message'] ?? ''));

                return ['lead' => $existing->fresh(), 'created' => false];
            }

            $attributes['status'] = LeadStatus::New->value;
            $attributes['score'] = $this->score($attributes);

            $lead = MarketingLead::create($attributes);

            $this->activity($lead, 'note', 'Lead captured from '.$source->label(), (string) ($attributes['message'] ?? ''));

            // The funnel sees a lead even though it arrived on the server.
            $this->events->record(EventName::Lead, [
                'visitor_id' => $lead->visitor_id,
                'lead_id' => $lead->getKey(),
                'campaign_id' => $lead->campaign_id,
                'path' => '/contact',
                'utm_source' => $lead->utm_source,
                'utm_medium' => $lead->utm_medium,
                'utm_campaign' => $lead->utm_campaign,
            ], ['source' => $lead->source->value]);

            return ['lead' => $lead, 'created' => true];
        });
    }

    /**
     * Which lead, if any, this submission belongs to.
     *
     * Email first (case-insensitive), then phone: a person who used a different
     * address on their second enquiry is still the same person.
     */
    public function findDuplicate(?string $email, ?string $phone): ?MarketingLead
    {
        if ($email !== null) {
            $match = MarketingLead::query()->whereRaw('lower(email) = ?', [$email])->latest('id')->first();

            if ($match !== null) {
                return $match;
            }
        }

        if ($phone !== null) {
            return MarketingLead::query()->where('phone', $phone)->latest('id')->first();
        }

        return null;
    }

    public function assign(MarketingLead $lead, ?User $assignee, ?User $actor = null): MarketingLead
    {
        $previous = $lead->assignee?->name;

        $lead->forceFill([
            'assigned_to' => $assignee?->getKey(),
            'assigned_at' => $assignee !== null ? Carbon::now() : null,
        ])->save();

        $this->activity(
            $lead,
            'assignment',
            $assignee !== null ? 'Assigned to '.$assignee->name : 'Unassigned',
            $previous !== null ? 'Previously '.$previous.'.' : null,
            $actor,
        );

        return $lead;
    }

    /**
     * Move a lead through the pipeline. Any transition is allowed — a sales process is
     * not a strict state machine — but every move is recorded on the timeline.
     */
    public function transition(
        MarketingLead $lead,
        LeadStatus $status,
        ?User $actor = null,
        ?string $note = null,
        ?string $lostReason = null,
    ): MarketingLead {
        $from = $lead->status;

        if ($from === $status && $note === null) {
            return $lead;
        }

        $lead->forceFill([
            'status' => $status,
            'lost_reason' => $status === LeadStatus::Lost ? ($lostReason ?? $lead->lost_reason) : null,
            'last_contacted_at' => in_array($status, [LeadStatus::Contacted, LeadStatus::Qualified, LeadStatus::DemoScheduled, LeadStatus::DemoCompleted], true)
                ? Carbon::now()
                : $lead->last_contacted_at,
        ])->save();

        $this->activity(
            $lead,
            'status_change',
            'Status: '.$from->label().' → '.$status->label(),
            $note ?? ($status === LeadStatus::Lost ? $lostReason : null),
            $actor,
        );

        return $lead;
    }

    public function addNote(MarketingLead $lead, string $body, ?User $actor = null, ?Carbon $followUpAt = null): MarketingLeadActivity
    {
        if ($followUpAt !== null) {
            $lead->forceFill(['follow_up_at' => $followUpAt])->save();
        }

        return $this->activity($lead, 'note', 'Note', $body, $actor);
    }

    /**
     * Link a lead to the restaurant that was created from it.
     *
     * The tenant already exists by this point — it is linked, never duplicated.
     */
    public function convert(MarketingLead $lead, Tenant $tenant, ?User $actor = null): MarketingLead
    {
        $lead->forceFill([
            'tenant_id' => $tenant->getKey(),
            'converted_at' => $lead->converted_at ?? Carbon::now(),
            'status' => LeadStatus::Converted,
            'lost_reason' => null,
        ])->save();

        $this->activity($lead, 'conversion', 'Converted to customer: '.$tenant->name, null, $actor);

        return $lead;
    }

    /**
     * Called when a restaurant registers: if the owner's address matches an open lead,
     * that lead becomes the customer. Without a match nothing happens — no lead is
     * invented for a registration that did not come through marketing.
     */
    public function linkByEmail(string $email, Tenant $tenant): ?MarketingLead
    {
        $lead = MarketingLead::query()
            ->whereRaw('lower(email) = ?', [$this->normaliseEmail($email)])
            ->whereNull('tenant_id')
            ->latest('id')
            ->first();

        return $lead === null ? null : $this->convert($lead, $tenant);
    }

    /** @param array<string, mixed> $attributes */
    public function score(array $attributes): int
    {
        $score = 0;

        if (! empty($attributes['business_name'])) {
            $score += 5;
        }

        $score += match ((string) ($attributes['branches_count'] ?? '')) {
            '2-5' => 5,
            '6-15' => 10,
            '15+' => 15,
            default => 0,
        };

        if (($attributes['source'] ?? null) === LeadSource::DemoForm->value) {
            $score += 10;
        }

        if (! empty($attributes['country'])) {
            $score += 2;
        }

        if (! empty($attributes['current_software'])) {
            $score += 3;
        }

        if (! empty($attributes['phone'])) {
            $score += 5;
        }

        return min(100, $score);
    }

    /**
     * @return array{utm_source: ?string, utm_medium: ?string, utm_campaign: ?string, utm_term: ?string, utm_content: ?string}
     */
    protected function attribution(array $data, ?MarketingVisitor $visitor): array
    {
        $pick = function (string $key) use ($data, $visitor) {
            $fromRequest = $data['utm_'.$key] ?? null;

            if (is_string($fromRequest) && trim($fromRequest) !== '') {
                return substr(trim($fromRequest), 0, 120);
            }

            $fromVisitor = $visitor?->firstTouch()[$key] ?? null;

            return is_string($fromVisitor) && $fromVisitor !== '' ? $fromVisitor : null;
        };

        return [
            'utm_source' => $pick('source'),
            'utm_medium' => $pick('medium'),
            'utm_campaign' => $pick('campaign'),
            'utm_term' => $pick('term'),
            'utm_content' => $pick('content'),
        ];
    }

    protected function campaignFor(?string $utmCampaign, ?string $utmTerm): ?MarketingCampaign
    {
        if ($utmCampaign === null) {
            return null;
        }

        return MarketingCampaign::query()
            ->where(fn ($query) => $query
                ->whereRaw('lower(utm_campaign) = ?', [strtolower($utmCampaign)])
                ->orWhereRaw('lower(slug) = ?', [strtolower($utmCampaign)]))
            ->first();
    }

    public function activity(MarketingLead $lead, string $type, string $title, ?string $body = null, ?User $actor = null): MarketingLeadActivity
    {
        return MarketingLeadActivity::create([
            'lead_id' => $lead->getKey(),
            'user_id' => $actor?->getKey(),
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'occurred_at' => Carbon::now(),
        ]);
    }

    public function normaliseEmail(?string $email): ?string
    {
        $email = strtolower(trim((string) $email));

        return $email === '' ? null : $email;
    }

    public function normalisePhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        return is_string($digits) && $digits !== '' ? $digits : null;
    }
}
