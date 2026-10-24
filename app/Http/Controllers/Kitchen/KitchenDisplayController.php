<?php

namespace App\Http\Controllers\Kitchen;

use App\Domain\Branches\Models\Branch;
use App\Domain\Kitchen\Enums\KitchenItemStatus;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Kitchen\Models\KitchenStation;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Kitchen\Models\KitchenTicketItem;
use App\Http\Controllers\Concerns\ResolvesActiveBranch;
use App\Http\Controllers\Controller;
use App\Http\Requests\Kitchen\ItemStatusRequest;
use App\Http\Requests\Kitchen\TicketStatusRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KitchenDisplayController extends Controller
{
    use ResolvesActiveBranch;

    public function __construct(protected KitchenService $kitchen) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $branch = $this->activeBranch($request);
        $branchId = $branch?->getKey();
        $stationId = $request->integer('station_id') ?: null;

        $tickets = KitchenTicket::query()
            ->with([
                'items.station:id,name',
                'order:id,order_number,order_type,source,table_id,fulfillment_status,customer_name',
                'order.table:id,name',
            ])
            ->where('branch_id', $branchId)
            ->whereIn('status', [
                KitchenTicketStatus::New->value,
                KitchenTicketStatus::Accepted->value,
                KitchenTicketStatus::Preparing->value,
                KitchenTicketStatus::Ready->value,
                KitchenTicketStatus::HandedOver->value,
            ])
            ->when($stationId, fn ($q) => $q->whereHas('items', fn ($i) => $i->where('station_id', $stationId)))
            ->orderByDesc('priority')
            ->orderBy('created_at')
            ->get()
            ->map(fn (KitchenTicket $ticket) => [
                'id' => $ticket->getKey(),
                'status' => $ticket->status->value,
                'priority' => $ticket->priority,
                'notes' => $ticket->notes,
                'elapsed_minutes' => $ticket->elapsedMinutes(),
                'created_at' => $ticket->created_at?->toIso8601String(),
                'order_number' => $ticket->order?->order_number,
                'order_type' => $ticket->order?->order_type->value,
                'order_source' => $ticket->order?->source->value,
                'table_name' => $ticket->order?->table?->name,
                'customer_name' => $ticket->order?->customer_name,
                'items' => $ticket->items->map(fn (KitchenTicketItem $item) => [
                    'id' => $item->getKey(),
                    'name' => $item->name,
                    'quantity' => (float) $item->quantity,
                    'status' => $item->status->value,
                    'station' => $item->station?->name,
                    'notes' => $item->notes,
                    'modifiers' => $item->modifiers,
                ]),
            ]);

        return Inertia::render('Kitchen/Index', [
            'branches' => Branch::query()->whereIn('id', $user->accessibleBranchIds())->active()->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'branchId' => $branchId,
            'stations' => KitchenStation::query()->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (KitchenStation $s) => ['id' => $s->getKey(), 'name' => $s->name]),
            'selectedStation' => $stationId,
            'tickets' => $tickets,
            'ticketStatuses' => collect(KitchenTicketStatus::cases())
                ->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->values(),
            'itemStatuses' => collect(KitchenItemStatus::cases())
                ->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->values(),
        ]);
    }

    public function setTicketStatus(TicketStatusRequest $request, KitchenTicket $ticket): RedirectResponse
    {
        $this->kitchen->setTicketStatus($ticket, KitchenTicketStatus::from($request->validated('status')));

        return back()->with('success', 'Ticket updated.');
    }

    public function setItemStatus(ItemStatusRequest $request, KitchenTicketItem $item): RedirectResponse
    {
        $item->loadMissing('ticket');

        // A ticket item is reachable only when its ticket's branch is one the
        // user may access (the item itself carries no branch column).
        abort_unless(
            $item->ticket && $request->user()->canAccessBranch($item->ticket->branch_id),
            404,
        );

        $this->kitchen->setItemStatus($item, KitchenItemStatus::from($request->validated('status')));

        return back();
    }

    public function setPriority(Request $request, KitchenTicket $ticket): RedirectResponse
    {
        $priority = $request->validate(['priority' => 'required|in:normal,urgent'])['priority'];

        $this->kitchen->setPriority($ticket, $priority);

        return back()->with('success', 'Priority updated.');
    }

    public function print(KitchenTicket $ticket): Response
    {
        $ticket->load(['items.station:id,name', 'order:id,order_number,order_type,table_id', 'order.table:id,name']);

        $this->kitchen->markPrinted($ticket);

        return Inertia::render('Kitchen/Ticket', [
            'ticket' => [
                'id' => $ticket->getKey(),
                'order_number' => $ticket->order?->order_number,
                'order_type' => $ticket->order?->order_type->value,
                'table_name' => $ticket->order?->table?->name,
                'priority' => $ticket->priority,
                'notes' => $ticket->notes,
                'created_at' => $ticket->created_at?->toIso8601String(),
                'items' => $ticket->items->map(fn (KitchenTicketItem $item) => [
                    'name' => $item->name,
                    'quantity' => (float) $item->quantity,
                    'station' => $item->station?->name,
                    'notes' => $item->notes,
                    'modifiers' => $item->modifiers,
                ]),
            ],
        ]);
    }
}
