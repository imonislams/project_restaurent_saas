<?php

namespace App\Http\Controllers\Orders;

use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\OrderService;
use App\Domain\POS\SaleService;
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
    public function __construct(
        protected OrderService $orders,
        protected SaleService $sales,
    ) {}

    public function index(Request $request): Response
    {
        $from = $request->date('from')?->startOfDay() ?? today()->startOfDay();
        $to = $request->date('to')?->endOfDay() ?? today()->endOfDay();
        $status = $request->string('status')->toString() ?: null;
        $type = $request->string('order_type')->toString() ?: null;

        $orders = Order::query()
            ->with(['cashier:id,name', 'branch:id,name', 'table:id,name'])
            ->withCount('items')
            ->whereBetween('placed_at', [$from, $to])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($type, fn ($q) => $q->where('order_type', $type))
            ->latest('placed_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Order $order) => [
                'id' => $order->getKey(),
                'order_number' => $order->order_number,
                'order_type' => $order->order_type->value,
                'order_type_label' => $order->order_type->label(),
                'status' => $order->status->value,
                'fulfillment_status' => $order->fulfillment_status->value,
                'fulfillment_label' => $order->fulfillment_status->label(),
                'table_name' => $order->table?->name,
                'branch_name' => $order->branch?->name,
                'cashier_name' => $order->cashier?->name,
                'items_count' => $order->items_count,
                'total' => (float) $order->total,
                'currency' => $order->currency,
                'placed_at' => $order->placed_at?->toIso8601String(),
            ]);

        return Inertia::render('Orders/Index', [
            'orders' => $orders,
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'status' => $status,
                'order_type' => $type,
            ],
            'statuses' => collect(OrderStatus::cases())
                ->map(fn (OrderStatus $s) => ['value' => $s->value, 'label' => $s->label()])->values(),
            'types' => collect(OrderType::cases())
                ->map(fn (OrderType $t) => ['value' => $t->value, 'label' => $t->label()])->values(),
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load(['items', 'payments.method', 'cashier:id,name', 'branch:id,name', 'table:id,name', 'kitchenTicket', 'statusHistory.user:id,name']);

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
        $this->sales->settle(
            $order,
            $request->validated('payments'),
            $request->user(),
            $request->validated('manager_pin'),
        );

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
