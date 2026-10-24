<?php

namespace App\Http\Controllers\Inventory;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockTransfer;
use App\Domain\Inventory\TransferService;
use App\Domain\Menu\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockTransferRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransferController extends Controller
{
    public function __construct(protected TransferService $transfers) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Transfers/Index', [
            'branches' => $tenant->branches()->whereIn('id', $request->user()->accessibleBranchIds())->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'items' => $this->itemOptions(),
            'transfers' => StockTransfer::query()
                ->with(['fromBranch:id,name', 'toBranch:id,name'])
                ->withCount('items')
                ->latest('id')
                ->limit(50)
                ->get()
                ->map(fn (StockTransfer $transfer) => [
                    'id' => $transfer->getKey(),
                    'number' => $transfer->number,
                    'from_branch' => $transfer->fromBranch?->name,
                    'to_branch' => $transfer->toBranch?->name,
                    'status' => $transfer->status->value,
                    'status_label' => $transfer->status->label(),
                    'items_count' => $transfer->items_count,
                    'notes' => $transfer->notes,
                    'created_at' => $transfer->created_at?->toIso8601String(),
                    'can_approve' => $transfer->status->value === 'draft',
                    'can_dispatch' => $transfer->status->value === 'approved',
                    'can_receive' => $transfer->status->value === 'dispatched',
                    'can_cancel' => in_array($transfer->status->value, ['draft', 'approved'], true),
                ]),
        ]);
    }

    public function store(StockTransferRequest $request): RedirectResponse
    {
        $transfer = $this->transfers->create($request->validated(), $request->user());

        return back()->with('success', 'Transfer '.$transfer->number.' created.');
    }

    public function approve(Request $request, StockTransfer $transfer): RedirectResponse
    {
        $this->transfers->approve($transfer, $request->user());

        return back()->with('success', 'Transfer approved.');
    }

    public function dispatch(Request $request, StockTransfer $transfer): RedirectResponse
    {
        $this->transfers->dispatch($transfer, $request->user());

        return back()->with('success', 'Transfer dispatched.');
    }

    public function receive(Request $request, StockTransfer $transfer): RedirectResponse
    {
        $this->transfers->receive($transfer, $request->user());

        return back()->with('success', 'Transfer received.');
    }

    public function cancel(Request $request, StockTransfer $transfer): RedirectResponse
    {
        $this->transfers->cancel($transfer, $request->user());

        return back()->with('success', 'Transfer cancelled.');
    }

    /**
     * Stockable items a transfer may move (ingredients and products).
     *
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    protected function itemOptions(): \Illuminate\Support\Collection
    {
        $ingredients = Ingredient::query()->orderBy('name')->get()->map(fn (Ingredient $ingredient) => [
            'value' => 'ingredient:'.$ingredient->getKey(),
            'label' => $ingredient->name,
            'type' => 'ingredient',
            'id' => $ingredient->getKey(),
            'cost' => (float) $ingredient->cost_per_unit,
        ]);

        $products = Product::query()->orderBy('name')->get()->map(fn (Product $product) => [
            'value' => 'product:'.$product->getKey(),
            'label' => $product->name,
            'type' => 'product',
            'id' => $product->getKey(),
            'cost' => (float) $product->cost_price,
        ]);

        return $ingredients->concat($products)->values();
    }
}
