<?php

namespace App\Http\Controllers\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\POS\OfflineBundle;
use App\Domain\POS\SaleService;
use App\Http\Controllers\Concerns\ResolvesActiveBranch;
use App\Http\Controllers\Controller;
use App\Http\Requests\POS\PlaceOrderRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    use ResolvesActiveBranch;

    public function __construct(protected SaleService $sales) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenant = $user->tenant;

        $branch = $this->activeBranch($request);

        $shift = $branch
            ? Shift::query()->where('branch_id', $branch->getKey())->open()->latest('opened_at')->with('openedBy:id,name')->first()
            : null;

        return Inertia::render('Pos/Index', [
            'branches' => Branch::query()->whereIn('id', $user->accessibleBranchIds())->active()->orderBy('name')->get()
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
            // Catalogue snapshot. Shared with GET /pos/offline-bundle so the online
            // and offline shapes cannot drift.
            ...app(OfflineBundle::class)->build($branch, $tenant),
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
                        'rejection_reason' => $o->rejected_reason,
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
