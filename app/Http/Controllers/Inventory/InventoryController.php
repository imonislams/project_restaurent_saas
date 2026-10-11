<?php

namespace App\Http\Controllers\Inventory;

use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\Models\Unit;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\IngredientRequest;
use App\Http\Requests\Inventory\StockMovementRequest;
use App\Http\Requests\Inventory\UnitRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(protected StockService $stock) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Inventory/Index', [
            'branches' => $tenant->branches()->active()->orderBy('name')->get()
                ->map(fn ($branch) => ['id' => $branch->getKey(), 'name' => $branch->name]),
            'locations' => StockLocation::query()
                ->with('branch:id,name')
                ->orderBy('name')
                ->get()
                ->map(fn (StockLocation $location) => [
                    'id' => $location->getKey(),
                    'name' => $location->name,
                    'branch_id' => $location->branch_id,
                    'branch_name' => $location->branch?->name,
                ]),
            'units' => Unit::query()->orderBy('name')->get()
                ->map(fn (Unit $unit) => ['id' => $unit->getKey(), 'name' => $unit->name, 'code' => $unit->code]),
            'ingredients' => Ingredient::query()->with('unit:id,code')->orderBy('name')->get()
                ->map(fn (Ingredient $ingredient) => [
                    'id' => $ingredient->getKey(),
                    'name' => $ingredient->name,
                    'unit_id' => $ingredient->unit_id,
                    'unit_code' => $ingredient->unit?->code,
                    'cost_per_unit' => (float) $ingredient->cost_per_unit,
                    'track_inventory' => $ingredient->track_inventory,
                    'is_active' => $ingredient->is_active,
                ]),
            'products' => Product::query()->orderBy('name')->get()
                ->map(fn (Product $product) => ['id' => $product->getKey(), 'name' => $product->name]),
            'balances' => StockBalance::query()
                ->with(['stockable', 'branch:id,name', 'stockLocation:id,name'])
                ->orderBy('quantity')
                ->get()
                ->map(fn (StockBalance $balance) => [
                    'id' => $balance->getKey(),
                    'branch_id' => $balance->branch_id,
                    'stock_location_id' => $balance->stock_location_id,
                    'item_id' => $balance->stockable_id,
                    'branch_name' => $balance->branch?->name,
                    'location_name' => $balance->stockLocation?->name,
                    'item_type' => $balance->stockable_type,
                    'item_name' => $balance->stockable?->name ?? 'Unknown',
                    'quantity' => (float) $balance->quantity,
                ]),
            'movements' => StockMovement::query()
                ->with(['stockable', 'stockLocation:id,name', 'creator:id,name'])
                ->latest('created_at')
                ->limit(100)
                ->get()
                ->map(fn (StockMovement $movement) => [
                    'id' => $movement->getKey(),
                    'created_at' => $movement->created_at?->toIso8601String(),
                    'item_type' => $movement->stockable_type,
                    'item_name' => $movement->stockable?->name ?? 'Unknown',
                    'quantity_delta' => (float) $movement->quantity_delta,
                    'reason' => $movement->reason->value,
                    'reason_label' => $movement->reason->label(),
                    'location_name' => $movement->stockLocation?->name,
                    'note' => $movement->note,
                    'user_name' => $movement->creator?->name,
                ]),
            'allowNegative' => (bool) $tenant->getSetting('inventory.allow_negative', false),
        ]);
    }

    public function storeUnit(UnitRequest $request): RedirectResponse
    {
        Unit::create($request->validated());

        return back()->with('success', 'Unit created.');
    }

    public function updateUnit(UnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        return back()->with('success', 'Unit updated.');
    }

    public function destroyUnit(Unit $unit): RedirectResponse
    {
        $unit->delete();

        return back()->with('success', 'Unit removed.');
    }

    public function storeIngredient(IngredientRequest $request): RedirectResponse
    {
        Ingredient::create($this->ingredientAttributes($request->validated()));

        return back()->with('success', 'Ingredient created.');
    }

    public function updateIngredient(IngredientRequest $request, Ingredient $ingredient): RedirectResponse
    {
        $ingredient->update($this->ingredientAttributes($request->validated()));

        return back()->with('success', 'Ingredient updated.');
    }

    public function destroyIngredient(Ingredient $ingredient): RedirectResponse
    {
        $ingredient->delete();

        return back()->with('success', 'Ingredient removed.');
    }

    public function storeOpening(StockMovementRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if ((float) $validated['quantity'] < 0) {
            throw ValidationException::withMessages(['quantity' => 'Opening stock cannot be negative.']);
        }

        $location = $this->location($validated);
        $item = $this->item($validated);

        $this->stock->receiveOpening(
            $item,
            $location,
            (float) $validated['quantity'],
            isset($validated['unit_cost']) ? (float) $validated['unit_cost'] : null,
        );

        return back()->with('success', 'Opening stock recorded.');
    }

    public function adjust(StockMovementRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if ((float) $validated['quantity'] < 0) {
            throw ValidationException::withMessages(['quantity' => 'Counted quantity cannot be negative.']);
        }

        $location = $this->location($validated);
        $item = $this->item($validated);

        $this->stock->adjustTo(
            $item,
            $location,
            (float) $validated['quantity'],
            $validated['note'] ?? null,
        );

        return back()->with('success', 'Stock adjusted.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function ingredientAttributes(array $data): array
    {
        $data['cost_per_unit'] = $data['cost_per_unit'] ?? 0;
        $data['track_inventory'] = $data['track_inventory'] ?? true;
        $data['is_active'] = $data['is_active'] ?? true;

        return $data;
    }

    protected function location(array $data): StockLocation
    {
        $location = StockLocation::findOrFail($data['stock_location_id']);

        if ((int) $location->branch_id !== (int) $data['branch_id']) {
            throw ValidationException::withMessages([
                'stock_location_id' => 'The selected location does not belong to the chosen branch.',
            ]);
        }

        return $location;
    }

    protected function item(array $data): Model
    {
        return $data['item_type'] === 'product'
            ? Product::findOrFail($data['item_id'])
            : Ingredient::findOrFail($data['item_id']);
    }
}
