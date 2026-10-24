<?php

namespace App\Http\Controllers\Waste;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Product;
use App\Domain\Waste\Enums\WasteReason;
use App\Domain\Waste\Models\WasteRecord;
use App\Domain\Waste\WasteService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Waste\WasteRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WasteController extends Controller
{
    public function __construct(protected WasteService $waste) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Waste/Index', [
            'branches' => $tenant->branches()->whereIn('id', $request->user()->accessibleBranchIds())->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'items' => $this->itemOptions(),
            'reasons' => collect(WasteReason::cases())
                ->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()])->values(),
            'records' => WasteRecord::query()
                ->with(['item', 'branch:id,name', 'recorder:id,name'])
                ->latest('id')
                ->limit(100)
                ->get()
                ->map(fn (WasteRecord $record) => [
                    'id' => $record->getKey(),
                    'item_name' => $record->item?->name ?? 'Unknown',
                    'branch' => $record->branch?->name,
                    'quantity' => (float) $record->quantity,
                    'cost' => (float) $record->cost,
                    'reason' => $record->reason->value,
                    'reason_label' => $record->reason->label(),
                    'status' => $record->status,
                    'notes' => $record->notes,
                    'recorded_by' => $record->recorder?->name,
                    'recorded_at' => $record->created_at?->toIso8601String(),
                ]),
            'approvalThreshold' => $tenant->getSetting('waste.approval_threshold'),
        ]);
    }

    public function store(WasteRequest $request): RedirectResponse
    {
        $record = $this->waste->record($request->validated(), $request->user());

        $message = $record->status === 'pending'
            ? 'Waste recorded — pending approval.'
            : 'Waste recorded.';

        return back()->with('success', $message);
    }

    public function approve(Request $request, WasteRecord $record): RedirectResponse
    {
        $this->waste->approve($record, $request->user());

        return back()->with('success', 'Waste approved.');
    }

    public function reject(Request $request, WasteRecord $record): RedirectResponse
    {
        $this->waste->reject($record, $request->user());

        return back()->with('success', 'Waste rejected.');
    }

    /**
     * Stockable items a waste record may target, with unit cost so the UI can
     * show an accurate loss valuation / approval preview.
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
