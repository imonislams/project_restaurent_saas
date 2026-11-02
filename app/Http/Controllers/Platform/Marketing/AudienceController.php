<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Marketing\Models\MarketingEmailSuppression;
use App\Domain\Marketing\Models\MarketingSegment;
use App\Domain\Marketing\Models\MarketingSubscriber;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Audience: who may be emailed, and who must never be.
 *
 * A subscriber row is the consent record for promotional mail, so adding one here is a
 * promise that the person opted in — the screen says so rather than implying a list can
 * be imported wholesale.
 */
class AudienceController extends Controller
{
    public function index(Request $request): Response
    {
        $search = (string) $request->string('search');

        return Inertia::render('Platform/Marketing/Automation/Audience', [
            'subscribers' => MarketingSubscriber::query()
                ->when($search !== '', fn ($query) => $query->where('email', 'like', '%'.$search.'%'))
                ->latest('id')
                ->paginate(25, ['*'], 'subscribers_page')
                ->withQueryString()
                ->through(fn (MarketingSubscriber $subscriber) => [
                    'id' => $subscriber->getKey(),
                    'email' => $subscriber->email,
                    'name' => $subscriber->name,
                    'status' => $subscriber->status,
                    'source' => $subscriber->source,
                    'consent_at' => $subscriber->consent_at?->toIso8601String(),
                    'unsubscribed_at' => $subscriber->unsubscribed_at?->toIso8601String(),
                ]),
            'suppressions' => MarketingEmailSuppression::query()
                ->latest('id')
                ->paginate(25, ['*'], 'suppressions_page')
                ->withQueryString()
                ->through(fn (MarketingEmailSuppression $row) => [
                    'id' => $row->getKey(),
                    'email' => $row->email,
                    'reason' => $row->reason,
                    'created_at' => $row->created_at?->toIso8601String(),
                ]),
            'segments' => MarketingSegment::query()->orderBy('name')->get()->map(fn (MarketingSegment $segment) => [
                'id' => $segment->getKey(),
                'name' => $segment->name,
                'type' => $segment->type,
                'rules' => $segment->rules ?? [],
                'member_count' => $segment->member_count,
            ])->all(),
            'filters' => ['search' => $search],
            'counts' => [
                'subscribed' => MarketingSubscriber::query()->where('status', 'subscribed')->count(),
                'unsubscribed' => MarketingSubscriber::query()->where('status', 'unsubscribed')->count(),
                'suppressed' => MarketingEmailSuppression::query()->count(),
            ],
        ]);
    }

    public function storeSubscriber(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'name' => ['nullable', 'string', 'max:150'],
            'consent_confirmed' => ['accepted'],
        ], [
            'consent_confirmed.accepted' => 'Confirm that this person agreed to receive marketing email.',
        ]);

        $subscriber = MarketingSubscriber::query()->updateOrCreate(
            ['email' => strtolower($data['email'])],
            [
                'name' => $data['name'] ?? null,
                'source' => 'manual',
                'status' => 'subscribed',
                'consent_at' => now(),
                'consent_source' => 'operator',
                'unsubscribed_at' => null,
                'unsubscribe_reason' => null,
            ],
        );

        // Re-subscribing is a fresh decision, so it lifts the suppression too.
        MarketingEmailSuppression::query()->where('email', $subscriber->email)->delete();

        return back()->with('success', $subscriber->email.' is subscribed.');
    }

    /**
     * Import a subscriber list from CSV.
     *
     * An import is a bulk assertion of consent, so it is gated on an explicit
     * confirmation and every row still goes through the same rules as a manual add:
     * an invalid address is skipped, and an address already suppressed stays
     * suppressed rather than being silently resurrected.
     *
     * Accepted header: email,name (name optional).
     */
    public function importSubscribers(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['nullable', 'file', 'mimes:csv,txt', 'max:4096'],
            'csv' => ['nullable', 'string', 'max:500000'],
            'consent_confirmed' => ['accepted'],
        ], [
            'consent_confirmed.accepted' => 'Confirm that everyone on this list agreed to receive marketing email.',
        ]);

        $content = $request->hasFile('file')
            ? (string) file_get_contents((string) $request->file('file')?->getRealPath())
            : (string) $request->input('csv', '');

        $lines = preg_split('/\R/', trim($content)) ?: [];
        $header = null;
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($lines as $index => $line) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            $cells = array_map('trim', str_getcsv($line));

            if ($header === null) {
                $header = array_map('strtolower', $cells);

                if (! in_array('email', $header, true)) {
                    return back()->with('error', 'The first row must be a header containing an "email" column.');
                }

                continue;
            }

            $row = array_combine(array_slice($header, 0, count($cells)), array_slice($cells, 0, count($header))) ?: [];
            $email = strtolower((string) ($row['email'] ?? ''));

            if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                $skipped++;
                $errors[] = 'Row '.($index + 1).': not a valid email address.';

                continue;
            }

            if (MarketingEmailSuppression::query()->where('email', $email)->exists()) {
                $skipped++;
                $errors[] = 'Row '.($index + 1).': '.$email.' is on the suppression list and was not re-subscribed.';

                continue;
            }

            $subscriber = MarketingSubscriber::query()->firstOrNew(['email' => $email]);
            $isNew = ! $subscriber->exists;

            $subscriber->fill([
                'name' => $row['name'] ?? $subscriber->name,
                'source' => 'import',
                'status' => 'subscribed',
                'consent_at' => $subscriber->consent_at ?? now(),
                'consent_source' => 'import',
                'unsubscribed_at' => null,
                'unsubscribe_reason' => null,
            ])->save();

            $isNew ? $created++ : $updated++;
        }

        $message = $created.' added, '.$updated.' updated, '.$skipped.' skipped.';

        return $errors === []
            ? back()->with('success', $message)
            : back()->with('success', $message)->with('error', implode(' ', array_slice($errors, 0, 5)));
    }

    public function destroySubscriber(MarketingSubscriber $subscriber): RedirectResponse
    {
        $subscriber->delete();

        return back()->with('success', 'Subscriber removed.');
    }

    public function storeSuppression(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'reason' => ['required', 'string', 'in:'.implode(',', MarketingEmailSuppression::REASONS)],
        ]);

        $email = strtolower($data['email']);

        MarketingEmailSuppression::query()->firstOrCreate(['email' => $email], ['reason' => $data['reason']]);

        MarketingSubscriber::query()->where('email', $email)->update([
            'status' => 'unsubscribed',
            'unsubscribed_at' => now(),
            'unsubscribe_reason' => $data['reason'],
        ]);

        return back()->with('success', $email.' will never receive marketing email again.');
    }

    public function destroySuppression(MarketingEmailSuppression $suppression): RedirectResponse
    {
        $suppression->delete();

        return back()->with('success', 'Address removed from the suppression list. It still needs an explicit opt-in before it is mailed.');
    }

    public function storeSegment(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'lead_status' => ['nullable', 'string', 'max:30'],
            'lead_source' => ['nullable', 'string', 'max:30'],
            'country' => ['nullable', 'string', 'size:2'],
        ]);

        MarketingSegment::query()->create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'type' => 'dynamic',
            'rules' => array_filter([
                'lead_status' => $data['lead_status'] ?? null,
                'lead_source' => $data['lead_source'] ?? null,
                'country' => isset($data['country']) ? strtoupper($data['country']) : null,
            ]),
        ]);

        return back()->with('success', 'Segment created. It narrows the audience of any campaign that uses it.');
    }
}
