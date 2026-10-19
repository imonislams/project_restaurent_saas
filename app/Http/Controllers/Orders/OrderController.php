<?php

namespace App\Http\Controllers\Orders;

use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\OrderService;
use App\Domain\POS\SaleService;
use App\Http\Controllers\Concerns\ResolvesActiveBranch;
use App\Http\Controllers\Controller;
use App\Http\Requests\Orders\FulfillmentRequest;
use App\Http\Requests\Orders\SettleOrderRequest;
use App\Http\Requests\Orders\VoidOrderRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    use ResolvesActiveBranch;

    public function __construct(
        protected OrderService $orders,
        protected SaleService $sales,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenantWide = $user->hasTenantWideBranchAccess();
        $accessible = $user->accessibleBranchIds();
        $rawBranch = $request->string('branch_id')->toString();
        $active = $this->activeBranch($request);

        // Default to the active branch; "all" is only honoured for tenant-wide users.
        if ($rawBranch === 'all' && $tenantWide) {
            $branchId = null;
        } elseif ($rawBranch !== '' && $rawBranch !== 'all' && in_array((int) $rawBranch, $accessible, true)) {
            $branchId = (int) $rawBranch;
        } else {
            $branchId = $active?->getKey();
        }

        $from = $request->date('from')?->startOfDay() ?? today()->startOfDay();
        $to = $request->date('to')?->endOfDay() ?? today()->endOfDay();
        $status = $request->string('status')->toString() ?: null;
        $type = $request->string('order_type')->toString() ?: null;
        $source = $request->string('source')->toString() ?: null;
        $acceptance = $request->string('acceptance')->toString() ?: null;

        $orders = Order::query()
            ->with(['cashier:id,name', 'branch:id,name', 'table:id,name', 'staff:id,name', 'confirmedBy:id,name', 'rejectedBy:id,name'])
            ->withCount('items')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->whereBetween('placed_at', [$from, $to])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($type, fn ($q) => $q->where('order_type', $type))
            ->when($source, fn ($q) => $q->where('source', $source))
            ->when($acceptance, fn ($q) => $q->where('acceptance_status', $acceptance))
            ->latest('placed_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Order $order) => [
                'id' => $order->getKey(),
                'order_number' => $order->order_number,
                'order_type' => $order->order_type->value,
                'order_type_label' => $order->order_type->label(),
                'source' => $order->source->value,
                'source_label' => $order->source->label(),
                'status' => $order->status->value,
                'acceptance_status' => $order->acceptance_status->value,
                'acceptance_label' => $order->acceptance_status->label(),
                'fulfillment_status' => $order->fulfillment_status->value,
                'fulfillment_label' => $order->fulfillment_status->label(),
                'table_name' => $order->table?->name,
                'branch_name' => $order->branch?->name,
                'cashier_name' => $order->cashier?->name,
                'staff' => $order->staff->map(fn ($user) => [
                    'id' => $user->getKey(),
                    'name' => $user->pivot->name ?: $user->name,
                ])->values(),
                'confirmed_by_name' => $order->confirmedBy?->name,
                'rejected_by_name' => $order->rejectedBy?->name,
                'rejection_reason' => $order->rejected_reason,
                'items_count' => $order->items_count,
                'total' => (float) $order->total,
                'currency' => $order->currency,
                'placed_at' => $order->placed_at?->toIso8601String(),
            ]);

        return Inertia::render('Orders/Index', [
            'orders' => $orders,
            'branches' => Branch::query()
                ->when(! $tenantWide, fn ($q) => $q->whereIn('id', $accessible))
                ->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'canViewAllBranches' => $tenantWide,
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'status' => $status,
                'order_type' => $type,
                'source' => $source,
                'acceptance' => $acceptance,
                'branch_id' => $branchId,
            ],
            'statuses' => collect(OrderStatus::cases())
                ->map(fn (OrderStatus $s) => ['value' => $s->value, 'label' => $s->label()])->values(),
            'types' => collect(OrderType::cases())
                ->map(fn (OrderType $t) => ['value' => $t->value, 'label' => $t->label()])->values(),
            'sources' => collect(\App\Domain\Orders\Enums\OrderSource::cases())
                ->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->values(),
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load(['items', 'payments.method', 'cashier:id,name', 'branch:id,name', 'table:id,name', 'staff:id,name', 'confirmedBy:id,name', 'rejectedBy:id,name', 'kitchenTicket', 'statusHistory.user:id,name']);

        return Inertia::render('Orders/Show', [
            'order' => $this->payload($order),
            'nextFulfillment' => array_map(
                fn (FulfillmentStatus $s) => ['value' => $s->value, 'label' => $s->label()],
                $order->fulfillment_status->allowedNext(),
            ),
            'paymentMethods' => $order->tenant->paymentMethods()->where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn ($m) => ['id' => $m->getKey(), 'name' => $m->name, 'type' => $m->type->value]),
        ]);
    }

    public function void(VoidOrderRequest $request, Order $order): RedirectResponse
    {
        $this->orders->void($order, $request->user(), $request->validated('manager_pin'));

        return back()->with('success', 'Order voided.');
    }

    public function settle(SettleOrderRequest $request, Order $order): RedirectResponse
    {
        $settled = $this->sales->settle(
            $order,
            $request->validated('payments'),
            $request->user(),
            $request->validated('manager_pin'),
        );

        // Close the dining session once every order at the table is settled.
        if ($settled->dining_session_id && $session = $settled->diningSession) {
            app(\App\Domain\Dining\DiningSessionService::class)->maybeCloseAfterSettlement($session);
        }

        return redirect()->route('orders.show', $order)
            ->with('success', 'Order settled.');
    }

    public function updateFulfillment(FulfillmentRequest $request, Order $order): RedirectResponse
    {
        $this->orders->setFulfillmentStatus(
            $order,
            FulfillmentStatus::from($request->validated('fulfillment_status')),
            $request->user(),
        );

        return back()->with('success', 'Fulfillment updated.');
    }

    public function accept(Request $request, Order $order): RedirectResponse
    {
        $this->orders->accept($order, $request->user());

        return back()->with('success', 'Order '.$order->order_number.' accepted and sent to the kitchen.');
    }

    public function reject(Request $request, Order $order): RedirectResponse
    {
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? null;

        $this->orders->reject($order, $request->user(), $reason);

        return back()->with('success', 'Order '.$order->order_number.' rejected.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function payload(Order $order): array
    {
        return [
            'id' => $order->getKey(),
            'order_number' => $order->order_number,
            'order_type' => $order->order_type->value,
            'order_type_label' => $order->order_type->label(),
            'source' => $order->source->value,
            'source_label' => $order->source->label(),
            'acceptance_status' => $order->acceptance_status->value,
            'acceptance_label' => $order->acceptance_status->label(),
            'status' => $order->status->value,
            'fulfillment_status' => $order->fulfillment_status->value,
            'fulfillment_label' => $order->fulfillment_status->label(),
            'is_open' => $order->isOpen(),
            'kitchen_status' => $order->kitchenTicket?->status->value,
            'table_name' => $order->table?->name,
            'customer_name' => $order->customer_name,
            'covers' => $order->covers,
            'notes' => $order->notes,
            'branch_name' => $order->branch?->name,
            'cashier_name' => $order->cashier?->name,
            'staff' => $order->staff->map(fn ($user) => [
                'id' => $user->getKey(),
                'name' => $user->pivot->name ?: $user->name,
            ])->values(),
            'confirmed_by_name' => $order->confirmedBy?->name,
            'confirmed_at' => $order->accepted_at?->toIso8601String(),
            'rejected_by_name' => $order->rejectedBy?->name,
            'rejection_reason' => $order->rejected_reason,
            'currency' => $order->currency,
            'subtotal' => (float) $order->subtotal,
            'discount_total' => (float) $order->discount_total,
            'tax_total' => (float) $order->tax_total,
            'service_charge' => (float) $order->service_charge,
            'total' => (float) $order->total,
            'paid_total' => (float) $order->paid_total,
            'change_due' => (float) $order->change_due,
            'placed_at' => $order->placed_at?->toIso8601String(),
            'can_void' => $order->canBeVoided(),
            'items' => $order->items->map(fn ($item) => [
                'name' => $item->name,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'discount_amount' => (float) $item->discount_amount,
                'tax_amount' => (float) $item->tax_amount,
                'line_total' => (float) $item->line_total,
                'notes' => $item->notes,
            ]),
            'payments' => $order->payments->map(fn ($payment) => [
                'method' => $payment->method?->name ?? '—',
                'amount' => (float) $payment->amount,
                'tendered' => $payment->tendered !== null ? (float) $payment->tendered : null,
                'change_due' => (float) $payment->change_due,
                'status' => $payment->status->value,
                'reference' => $payment->reference,
            ]),
            'history' => $order->statusHistory->map(fn ($entry) => [
                'note' => $entry->note,
                'user' => $entry->user?->name,
                'at' => $entry->created_at?->toIso8601String(),
            ]),
        ];
    }
}
