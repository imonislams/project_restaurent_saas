<?php

namespace App\Http\Controllers\Inventory;

use App\Domain\Inventory\Enums\StockMovementReason;
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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(protected StockService $stock) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        $filters = $this->inventoryFilters($request);
        $perPage = $filters['per_page'];
        $ingredients = Ingredient::query()->with('unit:id,code')->orderBy('name')->get();
        $units = Unit::query()->orderBy('name')->get();

        return Inertia::render('Inventory/Index', [
            'tab' => $this->inventoryTab($request),
            'branches' => $tenant->branches()->whereIn('id', $request->user()->accessibleBranchIds())->active()->orderBy('name')->get()
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
            'units' => Unit::query()
                ->orderBy('name')
                ->orderBy('id')
                ->paginate($perPage, ['*'], 'units_page')
                ->withQueryString()
                ->through(fn (Unit $unit) => $this->unitRow($unit)),
            'unitOptions' => $units
                ->map(fn (Unit $unit) => ['id' => $unit->getKey(), 'name' => $unit->name, 'code' => $unit->code]),
            'ingredients' => $this->ingredientQuery($filters)
                ->paginate($perPage, ['*'], 'ingredients_page')
                ->withQueryString()
                ->through(fn (Ingredient $ingredient) => $this->ingredientRow($ingredient)),
            'ingredientOptions' => $ingredients
                ->map(fn (Ingredient $ingredient) => ['id' => $ingredient->getKey(), 'name' => $ingredient->name]),
            'products' => Product::query()->orderBy('name')->get()
                ->map(fn (Product $product) => ['id' => $product->getKey(), 'name' => $product->name]),
            'balances' => $this->balanceQuery($filters)
                ->paginate($filters['per_page'], ['*'], 'balances_page')
                ->withQueryString()
                ->through(fn (StockBalance $balance) => $this->balanceRow($balance)),
            'balanceStats' => $this->balanceStats($ingredients),
            'inventoryFilters' => $filters,
            'movements' => $this->movementQuery($filters)
                ->paginate($perPage, ['*'], 'movements_page')
                ->withQueryString()
                ->through(fn (StockMovement $movement) => $this->movementRow($movement)),
            'allowNegative' => (bool) $tenant->getSetting('inventory.allow_negative', false),
        ]);
    }

    public function printStock(Request $request): Response
    {
        $filters = $this->inventoryFilters($request);
        $tab = $request->string('tab')->toString();
        $tab = in_array($tab, ['balances', 'movements', 'ingredients', 'units'], true) ? $tab : 'balances';

        $rows = match ($tab) {
            'movements' => $this->movementQuery($filters)
                ->get()
                ->map(fn (StockMovement $movement) => $this->movementRow($movement))
                ->values(),
            'ingredients' => $this->ingredientQuery($filters)
                ->get()
                ->map(fn (Ingredient $ingredient) => $this->ingredientRow($ingredient))
                ->values(),
            'units' => Unit::query()
                ->orderBy('name')
                ->orderBy('id')
                ->get()
                ->map(fn (Unit $unit) => $this->unitRow($unit))
                ->values(),
            default => $this->balanceQuery($filters)
                ->get()
                ->map(fn (StockBalance $balance) => $this->balanceRow($balance))
                ->values(),
        };

        return Inertia::render('Inventory/Print', [
            'tab' => $tab,
            'rows' => $rows,
            'total' => $rows->count(),
            'filterSummary' => $this->filterSummary($request, $filters, $tab),
        ]);
    }

    public function balance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => ['required', 'integer'],
            'stock_location_id' => ['required', 'integer'],
            'item_type' => ['required', Rule::in(['product', 'ingredient'])],
            'item_id' => ['required', 'integer', 'min:1'],
        ]);

        $location = $this->location($data);
        $item = $this->item($data);

        return response()->json([
            'quantity' => $this->stock->balanceFor($item, $location),
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

    protected function inventoryTab(Request $request): string
    {
        $tab = $request->string('tab')->toString();

        return in_array($tab, ['balances', 'movements', 'ingredients', 'units'], true)
            ? $tab
            : 'balances';
    }

    /**
     * @return array{search: string, branch_id: int|null, location_id: int|null, depleted: bool, movement_search: string, movement_reason: string, ingredient_search: string, per_page: int}
     */
    protected function inventoryFilters(Request $request): array
    {
        $perPage = $request->integer('per_page', 20);

        if (! in_array($perPage, [10, 20, 50, 100], true)) {
            $perPage = 20;
        }

        $reason = $request->string('movement_reason')->toString();
        $reasons = array_map(fn (StockMovementReason $case) => $case->value, StockMovementReason::cases());

        return [
            'search' => $request->string('search')->trim()->toString(),
            'branch_id' => $request->integer('branch_id') ?: null,
            'location_id' => $request->integer('location_id') ?: null,
            'depleted' => $request->boolean('depleted'),
            'movement_search' => $request->string('movement_search')->trim()->toString(),
            'movement_reason' => in_array($reason, $reasons, true) ? $reason : '',
            'ingredient_search' => $request->string('ingredient_search')->trim()->toString(),
            'per_page' => $perPage,
        ];
    }

    /**
     * @param  array{search: string, branch_id: int|null, location_id: int|null, depleted: bool, per_page: int}  $filters
     * @return Builder<StockBalance>
     */
    protected function balanceQuery(array $filters)
    {
        $search = $filters['search'];

        return StockBalance::query()
            ->with(['stockable', 'branch:id,name', 'stockLocation:id,name'])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(function ($scoped) use ($like) {
                    $scoped->whereHasMorph(
                        'stockable',
                        [Ingredient::class, Product::class],
                        fn ($item) => $item->where('name', 'like', $like),
                    )
                        ->orWhereHas('branch', fn ($branch) => $branch->where('name', 'like', $like))
                        ->orWhereHas('stockLocation', fn ($location) => $location->where('name', 'like', $like));
                });
            })
            ->when($filters['branch_id'], fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when($filters['location_id'], fn ($query, $locationId) => $query->where('stock_location_id', $locationId))
            ->when($filters['depleted'], fn ($query) => $query->where('quantity', '<=', 0))
            ->orderBy('quantity')
            ->orderBy('id');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<StockMovement>
     */
    protected function movementQuery(array $filters)
    {
        $search = $filters['movement_search'];
        $reason = $filters['movement_reason'];

        return StockMovement::query()
            ->with(['stockable', 'stockLocation:id,name', 'creator:id,name'])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';
                $reasons = collect(StockMovementReason::cases())
                    ->filter(fn (StockMovementReason $case) => mb_stripos($case->label(), $search) !== false)
                    ->map(fn (StockMovementReason $case) => $case->value)
                    ->all();

                $query->where(function ($scoped) use ($like, $reasons) {
                    $scoped->whereHasMorph(
                        'stockable',
                        [Ingredient::class, Product::class],
                        fn ($item) => $item->where('name', 'like', $like),
                    )
                        ->orWhere('note', 'like', $like)
                        ->orWhereHas('creator', fn ($creator) => $creator->where('name', 'like', $like));

                    if ($reasons !== []) {
                        $scoped->orWhereIn('reason', $reasons);
                    }
                });
            })
            ->when($reason !== '', fn ($query) => $query->where('reason', $reason))
            ->latest('created_at')
            ->latest('id');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Ingredient>
     */
    protected function ingredientQuery(array $filters)
    {
        $search = $filters['ingredient_search'];

        return Ingredient::query()
            ->with('unit:id,code')
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(function ($scoped) use ($like) {
                    $scoped->where('name', 'like', $like)
                        ->orWhereHas('unit', fn ($unit) => $unit->where('code', 'like', $like));
                });
            })
            ->orderBy('name')
            ->orderBy('id');
    }

    /**
     * Human-readable description of the filters applied to a printed document.
     *
     * @param  array<string, mixed>  $filters
     */
    protected function filterSummary(Request $request, array $filters, string $tab): string
    {
        $labels = [];

        if ($tab === 'balances') {
            if ($filters['search'] !== '') {
                $labels[] = 'Search: '.$filters['search'];
            }

            if ($filters['branch_id']) {
                $branchName = $request->user()->tenant->branches()
                    ->whereKey($filters['branch_id'])
                    ->value('name');

                if ($branchName) {
                    $labels[] = 'Branch: '.$branchName;
                }
            }

            if ($filters['location_id']) {
                $locationName = StockLocation::query()->whereKey($filters['location_id'])->value('name');

                if ($locationName) {
                    $labels[] = 'Location: '.$locationName;
                }
            }

            if ($filters['depleted']) {
                $labels[] = 'Depleted only';
            }
        }

        if ($tab === 'movements') {
            if ($filters['movement_search'] !== '') {
                $labels[] = 'Search: '.$filters['movement_search'];
            }

            if ($filters['movement_reason'] !== '') {
                $reason = StockMovementReason::tryFrom($filters['movement_reason']);
                $labels[] = 'Reason: '.($reason?->label() ?? $filters['movement_reason']);
            }
        }

        if ($tab === 'ingredients' && $filters['ingredient_search'] !== '') {
            $labels[] = 'Search: '.$filters['ingredient_search'];
        }

        return $labels === [] ? 'No filters applied' : implode(' · ', $labels);
    }

    /**
     * @return array<string, mixed>
     */
    protected function balanceRow(StockBalance $balance): array
    {
        return [
            'id' => $balance->getKey(),
            'branch_id' => $balance->branch_id,
            'stock_location_id' => $balance->stock_location_id,
            'item_id' => $balance->stockable_id,
            'branch_name' => $balance->branch?->name,
            'location_name' => $balance->stockLocation?->name,
            'item_type' => $balance->stockable_type,
            'item_name' => $balance->stockable?->name ?? 'Unknown',
            'quantity' => (float) $balance->quantity,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function movementRow(StockMovement $movement): array
    {
        return [
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
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function ingredientRow(Ingredient $ingredient): array
    {
        return [
            'id' => $ingredient->getKey(),
            'name' => $ingredient->name,
            'unit_id' => $ingredient->unit_id,
            'unit_code' => $ingredient->unit?->code,
            'cost_per_unit' => (float) $ingredient->cost_per_unit,
            'track_inventory' => $ingredient->track_inventory,
            'is_active' => $ingredient->is_active,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function unitRow(Unit $unit): array
    {
        return [
            'id' => $unit->getKey(),
            'name' => $unit->name,
            'code' => $unit->code,
        ];
    }

    /**
     * Global stock KPIs (unfiltered), matching the previous client-side formulas.
     *
     * @param  Collection<int, Ingredient>  $ingredients
     * @return array{depleted: int, valuation: float}
     */
    protected function balanceStats(Collection $ingredients): array
    {
        $depleted = StockBalance::query()->where('quantity', '<=', 0)->count();

        $costs = $ingredients->pluck('cost_per_unit', 'id');
        $quantities = StockBalance::query()
            ->where('stockable_type', (new Ingredient)->getMorphClass())
            ->where('quantity', '>', 0)
            ->selectRaw('stockable_id, SUM(quantity) as total_quantity')
            ->groupBy('stockable_id')
            ->pluck('total_quantity', 'stockable_id');

        $valuation = $quantities->reduce(function (float $carry, $quantity, $itemId) use ($costs): float {
            $cost = (float) ($costs[$itemId] ?? 0);

            return $cost > 0 ? $carry + ($cost * (float) $quantity) : $carry;
        }, 0.0);

        return ['depleted' => $depleted, 'valuation' => $valuation];
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
