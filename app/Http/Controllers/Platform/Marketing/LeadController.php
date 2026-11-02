<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\Enums\LeadStatus;
use App\Domain\Marketing\LeadService;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingLeadActivity;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The marketing CRM.
 *
 * Leads are the platform's own prospects — people evaluating the product — so nothing
 * here reads a restaurant's customers. The list uses server-side pagination and the
 * board is a bounded query, never the whole table.
 */
class LeadController extends Controller
{
    public function __construct(
        protected LeadService $leads,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => (string) $request->string('status'),
            'source' => (string) $request->string('source'),
            'assigned_to' => (string) $request->string('assigned_to'),
            'view' => $request->string('view')->toString() === 'board' ? 'board' : 'table',
        ];

        $query = $this->filtered($filters);

        $board = [];

        if ($filters['view'] === 'board') {
            foreach (LeadStatus::pipeline() as $status) {
                $board[] = [
                    'status' => $status->value,
                    'label' => $status->label(),
                    'leads' => (clone $query)->where('status', $status->value)->latest('id')->limit(12)->get()
                        ->map(fn (MarketingLead $lead) => $this->row($lead))->all(),
                ];
            }
        }

        return Inertia::render('Platform/Marketing/Leads/Index', [
            'leads' => $filters['view'] === 'table'
                ? $query->latest('id')->paginate(25)->withQueryString()->through(fn (MarketingLead $lead) => $this->row($lead))
                : ['data' => [], 'links' => []],
            'board' => $board,
            'filters' => $filters,
            'counts' => [
                'total' => MarketingLead::query()->count(),
                'open' => MarketingLead::query()->open()->count(),
                'due_today' => MarketingLead::query()->whereNotNull('follow_up_at')->whereDate('follow_up_at', '<=', Carbon::today())->count(),
                'unassigned' => MarketingLead::query()->open()->whereNull('assigned_to')->count(),
                'converted' => MarketingLead::query()->whereNotNull('converted_at')->count(),
            ],
            'options' => $this->options(),
        ]);
    }

    public function show(MarketingLead $lead): Response
    {
        return Inertia::render('Platform/Marketing/Leads/Show', [
            'lead' => $this->row($lead) + [
                'message' => $lead->message,
                'notes' => $lead->notes,
                'consent_marketing' => $lead->consent_marketing,
                'lost_reason' => $lead->lost_reason,
                'utm' => $lead->utm(),
                'visitor_id' => $lead->visitor_id,
                'tenant' => $lead->tenant ? [
                    'id' => $lead->tenant->getKey(),
                    'name' => $lead->tenant->name,
                ] : null,
            ],
            'activities' => $lead->activities()->limit(50)->get()->map(fn (MarketingLeadActivity $activity) => [
                'id' => $activity->getKey(),
                'type' => $activity->type,
                'title' => $activity->title,
                'body' => $activity->body,
                'actor' => $activity->user?->name,
                'occurred_at' => $activity->occurred_at?->toIso8601String(),
            ])->all(),
            'options' => $this->options(),
        ]);
    }

    public function update(Request $request, MarketingLead $lead): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'in:'.implode(',', LeadStatus::values())],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'follow_up_at' => ['nullable', 'date'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('assigned_to', $data)) {
            $assignee = $data['assigned_to'] !== null ? User::query()->find($data['assigned_to']) : null;
            $this->leads->assign($lead, $assignee, $request->user());
        }

        if (! empty($data['status'])) {
            $this->leads->transition(
                $lead,
                LeadStatus::from($data['status']),
                $request->user(),
                $data['note'] ?? null,
                $data['lost_reason'] ?? null,
            );
        }

        if (! empty($data['follow_up_at']) || $data['follow_up_at'] === null) {
            if (array_key_exists('follow_up_at', $data)) {
                $lead->forceFill(['follow_up_at' => $data['follow_up_at'] ? Carbon::parse($data['follow_up_at']) : null])->save();
            }
        }

        if (! empty($data['note'])) {
            $this->leads->addNote($lead, $data['note'], $request->user());
        }

        $this->audit->log('marketing.lead_updated', $lead, [
            'status' => $lead->status->value,
            'assigned_to' => $lead->assigned_to,
        ], $request->user());

        return back()->with('success', 'Lead updated.');
    }

    public function followUps(Request $request): Response
    {
        $due = MarketingLead::query()
            ->whereNotNull('follow_up_at')
            ->open()
            ->orderBy('follow_up_at')
            ->limit(100)
            ->get();

        $demos = MarketingLead::query()
            ->whereIn('status', [LeadStatus::DemoScheduled->value, LeadStatus::DemoCompleted->value])
            ->latest('id')
            ->limit(100)
            ->get();

        return Inertia::render('Platform/Marketing/Leads/FollowUps', [
            'due' => $due->map(fn (MarketingLead $lead) => $this->row($lead) + ['follow_up_at' => $lead->follow_up_at?->toIso8601String()])->all(),
            'demos' => $demos->map(fn (MarketingLead $lead) => $this->row($lead))->all(),
            'options' => $this->options(),
        ]);
    }

    public function sources(): Response
    {
        $rows = MarketingLead::query()
            ->selectRaw('source, channel, count(*) as total')
            ->selectRaw('sum(case when converted_at is not null then 1 else 0 end) as converted')
            ->groupBy('source', 'channel')
            ->orderByDesc('total')
            ->get()
            ->map(function ($row) {
                // The column is cast to an enum, so the raw value is what we want here.
                $source = (string) ($row->getRawOriginal('source') ?? '');

                return [
                    'source' => LeadSource::tryFrom($source)?->label() ?? $source,
                    'channel' => (string) ($row->channel ?? '—'),
                    'total' => (int) $row->total,
                    'converted' => (int) $row->converted,
                    'rate' => (int) $row->total > 0 ? round((int) $row->converted / (int) $row->total * 100, 1) : 0.0,
                ];
            })
            ->all();

        $byCampaign = MarketingLead::query()
            ->whereNotNull('campaign_id')
            ->with('campaign:id,name')
            ->get()
            ->groupBy(fn (MarketingLead $lead) => $lead->campaign?->name ?? 'Unknown')
            ->map(fn ($group, string $name) => [
                'campaign' => $name,
                'total' => $group->count(),
                'converted' => $group->filter(fn (MarketingLead $lead) => $lead->converted_at !== null)->count(),
            ])
            ->sortByDesc('total')
            ->values()
            ->all();

        return Inertia::render('Platform/Marketing/Leads/Sources', [
            'rows' => $rows,
            'byCampaign' => $byCampaign,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => (string) $request->string('status'),
            'source' => (string) $request->string('source'),
            'assigned_to' => (string) $request->string('assigned_to'),
            'view' => 'table',
        ];

        $this->audit->log('marketing.lead_exported', null, [
            'filters' => $filters,
            'rows' => $this->filtered($filters)->count(),
        ], $request->user());

        return response()->streamDownload(function () use ($filters) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Name', 'Email', 'Phone', 'Business', 'Country', 'Source', 'Channel', 'Campaign', 'Status', 'Score', 'Assigned to', 'Follow up', 'Converted at']);

            $this->filtered($filters)->latest('id')->chunk(500, function ($leads) use ($handle) {
                foreach ($leads as $lead) {
                    fputcsv($handle, [
                        $lead->name,
                        $lead->email,
                        $lead->phone,
                        $lead->business_name,
                        $lead->country,
                        $lead->source->value,
                        $lead->channel?->value,
                        $lead->campaign?->name,
                        $lead->status->value,
                        $lead->score,
                        $lead->assignee?->name,
                        $lead->follow_up_at?->toDateString(),
                        $lead->converted_at?->toDateString(),
                    ]);
                }
            });

            fclose($handle);
        }, 'marketing-leads-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** @param array<string, string> $filters */
    protected function filtered(array $filters)
    {
        return MarketingLead::query()
            ->with(['assignee:id,name', 'campaign:id,name', 'tenant:id,name'])
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = $filters['search'];
                $query->where(fn ($inner) => $inner
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('business_name', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%'));
            })
            ->when($filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['source'] !== '', fn ($query) => $query->where('source', $filters['source']))
            ->when($filters['assigned_to'] !== '', fn ($query) => $filters['assigned_to'] === 'unassigned'
                ? $query->whereNull('assigned_to')
                : $query->where('assigned_to', (int) $filters['assigned_to']));
    }

    /** @return array<string, mixed> */
    protected function row(MarketingLead $lead): array
    {
        return [
            'id' => $lead->getKey(),
            'name' => $lead->name,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'business_name' => $lead->business_name,
            'country' => $lead->country,
            'city' => $lead->city,
            'branches_count' => $lead->branches_count,
            'restaurant_category' => $lead->restaurant_category,
            'current_software' => $lead->current_software,
            'source' => $lead->source->value,
            'source_label' => $lead->source->label(),
            'channel' => $lead->channel?->value,
            'status' => $lead->status->value,
            'status_label' => $lead->status->label(),
            'score' => $lead->score,
            'assignee' => $lead->assignee?->name,
            'assigned_to' => $lead->assigned_to,
            'campaign' => $lead->campaign?->name,
            'tenant' => $lead->tenant?->name,
            'is_converted' => $lead->isConverted(),
            'created_at' => $lead->created_at?->toIso8601String(),
            'last_contacted_at' => $lead->last_contacted_at?->toIso8601String(),
            'follow_up_at' => $lead->follow_up_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    protected function options(): array
    {
        return [
            'statuses' => collect(LeadStatus::cases())->map(fn (LeadStatus $status) => [
                'value' => $status->value,
                'label' => $status->label(),
            ])->values(),
            'sources' => collect(LeadSource::cases())->map(fn (LeadSource $source) => [
                'value' => $source->value,
                'label' => $source->label(),
            ])->values(),
            'assignees' => User::query()
                ->where('is_platform_admin', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user) => ['value' => (string) $user->getKey(), 'label' => $user->name])
                ->values(),
        ];
    }
}
