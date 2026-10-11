<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Support\Enums\TicketPriority;
use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Models\SupportTicket;
use App\Domain\Support\SupportService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\ReplySupportTicketRequest;
use App\Http\Requests\Platform\StoreSupportTicketRequest;
use App\Http\Requests\Platform\UpdateSupportTicketRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportTicketController extends Controller
{
    public function __construct(protected SupportService $support) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'priority' => $request->string('priority')->toString(),
        ];

        return Inertia::render('Platform/Support/Index', [
            'tickets' => SupportTicket::query()
                ->with(['tenant:id,name', 'assignedTo:id,name'])
                ->withCount('messages')
                ->when($filters['search'] !== '', fn ($q) => $q->where('subject', 'like', '%'.$filters['search'].'%'))
                ->when($filters['status'] !== '', fn ($q) => $q->where('status', $filters['status']))
                ->when($filters['priority'] !== '', fn ($q) => $q->where('priority', $filters['priority']))
                ->latest('last_reply_at')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (SupportTicket $ticket) => [
                    'id' => $ticket->getKey(),
                    'subject' => $ticket->subject,
                    'tenant' => $ticket->tenant?->name,
                    'tenant_id' => $ticket->tenant_id,
                    'status' => $ticket->status->value,
                    'status_label' => $ticket->status->label(),
                    'priority' => $ticket->priority->value,
                    'assigned_to' => $ticket->assignedTo?->name,
                    'messages_count' => $ticket->messages_count,
                    'last_reply_at' => $ticket->last_reply_at?->toIso8601String(),
                ]),
            'filters' => $filters,
            'tenants' => Tenant::query()->orderBy('name')->limit(200)->get(['id', 'name'])
                ->map(fn (Tenant $tenant) => ['id' => $tenant->getKey(), 'name' => $tenant->name])->all(),
            'options' => [
                'statuses' => collect(TicketStatus::cases())->map(fn (TicketStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
                'priorities' => collect(TicketPriority::cases())->map(fn (TicketPriority $p) => ['value' => $p->value, 'label' => $p->label()])->all(),
            ],
        ]);
    }

    public function show(SupportTicket $ticket): Response
    {
        $ticket->load(['tenant:id,name', 'assignedTo:id,name', 'messages.author:id,name']);

        return Inertia::render('Platform/Support/Show', [
            'ticket' => [
                'id' => $ticket->getKey(),
                'subject' => $ticket->subject,
                'status' => $ticket->status->value,
                'status_label' => $ticket->status->label(),
                'priority' => $ticket->priority->value,
                'tenant' => $ticket->tenant?->name,
                'tenant_id' => $ticket->tenant_id,
                'assigned_to' => $ticket->assignedTo?->name,
                'created_at' => $ticket->created_at?->toIso8601String(),
                'resolved_at' => $ticket->resolved_at?->toIso8601String(),
                'messages' => $ticket->messages->sortBy('id')->values()->map(fn ($message) => [
                    'id' => $message->getKey(),
                    'author' => $message->author?->name ?? 'System',
                    'body' => $message->body,
                    'is_internal' => $message->is_internal,
                    'created_at' => $message->created_at?->toIso8601String(),
                ])->all(),
            ],
            'options' => [
                'statuses' => collect(TicketStatus::cases())->map(fn (TicketStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
            ],
        ]);
    }

    public function store(StoreSupportTicketRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tenant = Tenant::query()->findOrFail($data['tenant_id']);

        $ticket = $this->support->create($tenant, $data, $request->user());

        return redirect()->route('platform.support.show', $ticket)
            ->with('success', 'Support ticket created.');
    }

    public function reply(ReplySupportTicketRequest $request, SupportTicket $ticket): RedirectResponse
    {
        $data = $request->validated();

        $this->support->reply($ticket, $data['body'], (bool) ($data['internal'] ?? false), $request->user());

        return back()->with('success', 'Reply added.');
    }

    public function updateStatus(UpdateSupportTicketRequest $request, SupportTicket $ticket): RedirectResponse
    {
        $this->support->setStatus($ticket, TicketStatus::from($request->validated()['status']), $request->user());

        return back()->with('success', 'Ticket status updated.');
    }
}
