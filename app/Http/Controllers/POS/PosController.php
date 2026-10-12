<?php

namespace App\Http\Controllers\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\POS\SaleService;
use App\Http\Controllers\Controller;
use App\Http\Requests\POS\PlaceOrderRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(protected SaleService $sales) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenant = $user->tenant;

        $accessible = $user->accessibleBranchIds();
        $branchId = $request->integer('branch_id')
            ?: ($tenant->primaryBranch?->getKey() ?? ($accessible[0] ?? null));

        $branch = $branchId ? Branch::query()->find($branchId) : null;

        $shift = $branch
            ? Shift::query()->where('branch_id', $branch->getKey())->open()->latest('opened_at')->with('openedBy:id,name')->first()
            : null;

        return Inertia::render('Pos/Index', [
            'branches' => Branch::query()->whereIn('id', $accessible)->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'branch' => $branch ? [
                'id' => $branch->getKey(),
                'name' => $branch->name,
                'currency' => $branch->effectiveCurrency(),
            ] : null,
            'shift' => $shift ? [
                'id' => $shift->getKey(),
                'opening_float' => (float) $shift->opening_float,
                'expected_cash' => $shift->currentExpectedCash(),
                'opened_at' => $shift->opened_at?->toIso8601String(),
                'opened_by' => $shift->openedBy?->name,
            ] : null,
            'products' => Product::query()
                ->where('is_active', true)
                ->with(['category:id,name', 'variants', 'modifierGroups.options'])
                ->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (Product $product) => [
                    'id' => $product->getKey(),
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'category_id' => $product->category_id,
                    'price_dine_in' => (float) $product->price_dine_in,
                    'price_takeaway' => (float) $product->price_takeaway,
                    'price_delivery' => (float) $product->price_delivery,
                    'is_available' => $product->is_available,
                    'variants' => $product->variants->map(fn ($v) => [
                        'id' => $v->getKey(),
                        'name' => $v->name,
                        'price' => $v->price !== null ? (float) $v->price : null,
                    ]),
                    'modifier_groups' => $product->modifierGroups
                        ->where('is_active', true)
                        ->map(fn ($group) => [
                            'id' => $group->getKey(),
                            'name' => $group->name,
                            'selection_type' => $group->selection_type->value,
                            'min_select' => $group->effectiveMin(),
                            'max_select' => $group->effectiveMax(),
                            'is_required' => $group->is_required,
                            'options' => $group->options
                                ->where('is_active', true)
                                ->map(fn ($option) => [
                                    'id' => $option->getKey(),
                                    'name' => $option->name,
                                    'price_delta' => (float) $option->price_delta,
                                ])->values(),
                        ])->values(),
                ]),
            'categories' => Category::query()->where('is_active', true)
                ->withCount('products')
                ->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (Category $c) => ['id' => $c->getKey(), 'name' => $c->name, 'products_count' => $c->products_count]),
            'paymentMethods' => $tenant->paymentMethods()->where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn ($m) => ['id' => $m->getKey(), 'name' => $m->name, 'type' => $m->type->value]),
            'taxInclusive' => (bool) $tenant->getSetting('tax.inclusive', false),
            'taxRate' => (float) $tenant->getSetting('tax.rate', 0),
            'serviceChargeRate' => (float) $tenant->getSetting('service_charge.rate', 0),
            'tables' => $branch
                ? $branch->tables()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get()
                    ->map(fn ($table) => [
                        'id' => $table->getKey(),
                        'name' => $table->name,
                        'seats' => $table->seats,
                        'status' => $table->status->value,
                    ])
                : [],
            'customers' => Customer::query()->where('is_active', true)->orderBy('name')->limit(200)->get()
                ->map(fn ($customer) => ['id' => $customer->getKey(), 'name' => $customer->name, 'phone' => $customer->phone]),
            'deliveryZones' => $branch
                ? DeliveryZone::query()->where('is_active', true)
                    ->where(fn ($q) => $q->whereNull('branch_id')->orWhere('branch_id', $branch->getKey()))
                    ->orderBy('name')->get()
                    ->map(fn ($zone) => ['id' => $zone->getKey(), 'name' => $zone->name, 'fee' => (float) $zone->fee])
                : [],
            'openOrders' => $branch
                ? Order::query()->where('branch_id', $branch->getKey())
                    ->whereIn('status', [OrderStatus::Held->value, OrderStatus::Draft->value])
                    ->with(['table:id,name'])
                    ->withCount('items')
                    ->latest()
                    ->limit(15)
                    ->get()
                    ->map(fn (Order $o) => [
                        'id' => $o->getKey(),
                        'order_number' => $o->order_number,
                        'table_name' => $o->table?->name,
                        'customer_name' => $o->customer_name,
                        'order_type' => $o->order_type->value,
                        'source' => $o->source->value,
                        'acceptance_status' => $o->acceptance_status->value,
                        'total' => (float) $o->total,
                        'items_count' => $o->items_count,
                        'placed_at' => $o->created_at?->diffForHumans() ?? '',
                    ])
                : [],
        ]);
    }

    public function store(PlaceOrderRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $branch = Branch::query()->findOrFail($validated['branch_id']);

        $order = $this->sales->place($validated, $request->user(), $branch);

        return redirect()->route('orders.receipt', $order)
            ->with('success', 'Sale '.$order->order_number.' completed.');
    }

    public function open(PlaceOrderRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $branch = Branch::query()->findOrFail($validated['branch_id']);

        $order = $this->sales->openOrder($validated, $request->user(), $branch);

        return redirect()->route('orders.show', $order)
            ->with('success', 'Order '.$order->order_number.' opened.');
    }
}
