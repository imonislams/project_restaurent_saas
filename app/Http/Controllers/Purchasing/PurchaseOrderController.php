<?php

namespace App\Http\Controllers\Purchasing;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Product;
use App\Domain\Purchasing\Enums\PurchaseOrderStatus;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Purchasing\PurchasingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchasing\PurchaseOrderRequest;
use App\Http\Requests\Purchasing\ReceiveGoodsRequest;
use App\Http\Requests\Purchasing\SupplierPaymentRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    public function __construct(protected PurchasingService $purchasing) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Purchasing/Index', [
            'suppliers' => Supplier::query()->orderBy('name')->get()
                ->map(fn (Supplier $supplier) => [
                    'id' => $supplier->getKey(),
                    'name' => $supplier->name,
                    'contact_name' => $supplier->contact_name,
                    'phone' => $supplier->phone,
                    'email' => $supplier->email,
                    'is_active' => $supplier->is_active,
                    'outstanding' => $supplier->outstandingBalance(),
                ]),
            'orders' => PurchaseOrder::query()
                ->with(['supplier:id,name', 'branch:id,name'])
                ->withCount('items')
                ->latest('id')
                ->limit(50)
                ->get()
                ->map(fn (PurchaseOrder $order) => [
                    'id' => $order->getKey(),
                    'number' => $order->number,
                    'supplier' => $order->supplier?->name,
                    'branch' => $order->branch?->name,
                    'status' => $order->status->value,
                    'status_label' => $order->status->label(),
                    'items_count' => $order->items_count,
                    'total' => (float) $order->total,
                    'is_receivable' => $order->status->isReceivable(),
                ]),
            'branches' => $tenant->branches()->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'items' => $this->itemOptions($tenant->getKey()),
            'statuses' => collect(PurchaseOrderStatus::cases())
                ->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->values(),
        ]);
    }

    public function store(PurchaseOrderRequest $request): RedirectResponse
    {
        $order = $this->purchasing->create($request->validated(), $request->user());

        return redirect()->route('purchasing.orders.show', $order)
            ->with('success', 'Purchase order '.$order->number.' created.');
    }

    public function show(PurchaseOrder $order): Response
    {
        $order->load(['supplier', 'branch:id,name', 'items', 'receipts.items', 'payments.creator:id,name', 'creator:id,name']);

        return Inertia::render('Purchasing/Show', [
            'order' => [
                'id' => $order->getKey(),
                'number' => $order->number,
                'status' => $order->status->value,
                'status_label' => $order->status->label(),
                'supplier' => $order->supplier?->name,
                'supplier_id' => $order->supplier_id,
                'branch' => $order->branch?->name,
                'notes' => $order->notes,
                'subtotal' => (float) $order->subtotal,
                'total' => (float) $order->total,
                'paid_total' => $order->paidTotal(),
                'outstanding' => round((float) $order->total - $order->paidTotal(), 2),
                'is_editable' => $order->status->isEditable(),
                'is_submittable' => $order->status === PurchaseOrderStatus::Draft,
                'is_approvable' => $order->status === PurchaseOrderStatus::Submitted,
                'is_receivable' => $order->status->isReceivable(),
                'created_at' => $order->created_at?->toIso8601String(),
                'approved_at' => $order->approved_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->getKey(),
                    'description' => $item->description,
                    'quantity' => (float) $item->quantity,
                    'received_quantity' => (float) $item->received_quantity,
                    'outstanding' => $item->outstandingQuantity(),
                    'unit_cost' => (float) $item->unit_cost,
                    'line_total' => (float) $item->line_total,
                ]),
                'receipts' => $order->receipts->map(fn ($receipt) => [
                    'id' => $receipt->getKey(),
                    'number' => $receipt->number,
                    'received_at' => $receipt->received_at?->toIso8601String(),
                    'items' => $receipt->items->map(fn ($i) => [
                        'quantity' => (float) $i->quantity,
                        'rejected_quantity' => (float) $i->rejected_quantity,
                    ]),
                ]),
                'payments' => $order->payments->map(fn ($payment) => [
                    'amount' => (float) $payment->amount,
                    'method' => $payment->method,
                    'reference' => $payment->reference,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'by' => $payment->creator?->name,
                ]),
            ],
        ]);
    }

    public function update(PurchaseOrderRequest $request, PurchaseOrder $order): RedirectResponse
    {
        $this->purchasing->update($order, $request->validated()['items'], $request->user());

        return back()->with('success', 'Purchase order updated.');
    }

    public function submit(PurchaseOrder $order, Request $request): RedirectResponse
    {
        $this->purchasing->submit($order, $request->user());

        return back()->with('success', 'Purchase order submitted for approval.');
    }

    public function approve(Request $request, PurchaseOrder $order): RedirectResponse
    {
        $data = $request->validate(['manager_pin' => 'nullable|string|max:12']);

        $this->purchasing->approve($order, $request->user(), $data['manager_pin'] ?? null);

        return back()->with('success', 'Purchase order approved.');
    }

    public function cancel(Request $request, PurchaseOrder $order): RedirectResponse
    {
        $this->purchasing->cancel($order, $request->user());

        return back()->with('success', 'Purchase order cancelled.');
    }

    public function receive(ReceiveGoodsRequest $request, PurchaseOrder $order): RedirectResponse
    {
        $receipt = $this->purchasing->receive($order, $request->validated('lines'), $request->user());

        return back()->with('success', 'Goods received ('.$receipt->number.').');
    }

    public function pay(SupplierPaymentRequest $request, PurchaseOrder $order): RedirectResponse
    {
        $supplier = Supplier::query()->findOrFail($order->supplier_id);
        $this->purchasing->recordPayment($supplier, $request->validated(), $request->user(), $order);

        return back()->with('success', 'Payment recorded.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function itemOptions(int $tenantId): array
    {
        $ingredients = Ingredient::query()->orderBy('name')->get()
            ->map(fn (Ingredient $i) => [
                'value' => 'ingredient:'.$i->getKey(),
                'label' => '[Ingredient] '.$i->name,
                'type' => 'ingredient',
                'id' => $i->getKey(),
                'cost' => (float) $i->cost_per_unit,
            ]);

        $products = Product::query()->orderBy('name')->get()
            ->map(fn (Product $p) => [
                'value' => 'product:'.$p->getKey(),
                'label' => '[Product] '.$p->name,
                'type' => 'product',
                'id' => $p->getKey(),
                'cost' => (float) $p->cost_price,
            ]);

        return array_merge($ingredients->all(), $products->all());
    }
}
