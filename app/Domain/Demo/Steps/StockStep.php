<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Accounting\Models\ExpenseCategory;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Demo\Data\DemoProfile;
use App\Domain\Demo\DemoRun;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Purchasing\Models\Supplier;

/**
 * The pantry: ingredients with opening stock, suppliers, delivery zones and
 * expense categories. Everything the later steps buy, sell or waste.
 */
class StockStep implements DemoStep
{
    /** Items the catalog also sells as packaged products (they track their own stock). */
    public const PACKAGED_KEYS = ['soft_drink', 'water', 'cola'];

    protected const EXPENSE_CATEGORIES = [
        'Rent',
        'Utilities',
        'Staff Salaries',
        'Marketing',
        'Maintenance',
        'Supplies',
        'Licences & Permits',
    ];

    public function key(): string
    {
        return 'stock';
    }

    public function label(): string
    {
        return 'Ingredients, suppliers & delivery zones';
    }

    public function run(DemoRun $run): array
    {
        $profile = $run->profile();
        $units = (array) $run->ref('units', []);

        $ingredients = $this->ingredients($run, $profile, $units);
        $this->openingStock($run, $profile, $ingredients);

        $expenseCategories = $this->expenseCategories($run);
        $suppliers = $this->suppliers($run, $profile);
        $zones = $this->deliveryZones($run, $profile);

        $run->putRefs([
            'expense_categories' => $expenseCategories,
            'suppliers' => $suppliers,
            'zones' => $zones,
        ]);

        return [
            'ingredients' => count($ingredients),
            'suppliers' => count($suppliers),
        ];
    }

    /**
     * @param  array<string, int>  $units  unit code => id
     * @return array<string, int> ingredient key => id
     */
    protected function ingredients(DemoRun $run, DemoProfile $profile, array $units): array
    {
        $tenantId = $run->batch->tenant_id;
        $ids = [];
        $unitIds = [];

        foreach ($profile->ingredients() as $key => $definition) {
            if (in_array($key, self::PACKAGED_KEYS, true)) {
                continue;
            }

            $ingredient = Ingredient::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $definition['name']],
                [
                    'unit_id' => $units[$definition['unit']] ?? null,
                    'cost_per_unit' => $definition['cost'],
                    'track_inventory' => true,
                    'is_active' => true,
                ],
            );

            $ids[$key] = $ingredient->getKey();
            $unitIds[$key] = $ingredient->unit_id;
        }

        $run->putRefs([
            'ingredients' => $ids,
            'ingredient_units' => $unitIds,
        ]);

        return $ids;
    }

    /**
     * Open the pantry with a generous stock so three weeks of trade never runs
     * it dry (the demo deliberately creates low stock later, on purpose).
     *
     * @param  array<string, int>  $ingredients
     */
    protected function openingStock(DemoRun $run, DemoProfile $profile, array $ingredients): void
    {
        $factor = $profile->openingStockFactor();
        $random = $run->random('opening-stock');

        $primary = $run->branch('primary');
        $annex = $run->branch('annex');

        $primaryLocation = $run->location($primary);
        $annexLocation = $run->location($annex);

        $baseByUnit = ['kg' => 40.0, 'L' => 25.0, 'pc' => 200.0, 'g' => 500.0, 'mL' => 500.0];

        foreach ($profile->ingredients() as $key => $definition) {
            if (! isset($ingredients[$key])) {
                continue;
            }

            $ingredient = Ingredient::query()->withoutGlobalScopes()->find($ingredients[$key]);

            if (! $ingredient) {
                continue;
            }

            $base = $baseByUnit[$definition['unit']] ?? 20.0;
            $primaryQuantity = round($base * $factor * $random->float(0.85, 1.15, 2), 2);

            $run->establishStock($ingredient, $primaryLocation, $primaryQuantity);

            // The secondary branch carries a smaller pantry.
            $run->establishStock($ingredient, $annexLocation, round($primaryQuantity * 0.4, 2));
        }
    }

    /** @return array<string, int> category name => id */
    protected function expenseCategories(DemoRun $run): array
    {
        $tenantId = $run->batch->tenant_id;
        $ids = [];

        foreach (self::EXPENSE_CATEGORIES as $name) {
            $category = ExpenseCategory::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $name],
                ['is_active' => true],
            );

            $ids[$name] = $category->getKey();
        }

        return $ids;
    }

    /** @return array<int, int> supplier index => id (matches the purchase plan) */
    protected function suppliers(DemoRun $run, DemoProfile $profile): array
    {
        $tenantId = $run->batch->tenant_id;
        $ids = [];

        foreach ($profile->suppliers() as $index => $definition) {
            $supplier = Supplier::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $definition['name']],
                [
                    'contact_name' => $definition['contact'],
                    'phone' => $definition['phone'],
                    'email' => $definition['email'],
                    'address' => $profile->names()->address($run->random('supplier-'.$index)),
                    'payment_terms_days' => $definition['terms'],
                    'is_active' => true,
                ],
            );

            $ids[$index] = $supplier->getKey();
        }

        return $ids;
    }

    /**
     * Delivery zones, with their fee and minimum order kept in the refs so the
     * order generator only ever sends a delivery the zone actually accepts.
     *
     * @return list<array{id: int, name: string, fee: float, min_order: float}>
     */
    protected function deliveryZones(DemoRun $run, DemoProfile $profile): array
    {
        $tenantId = $run->batch->tenant_id;
        $primary = $run->branch('primary');
        $zones = [];

        foreach ($profile->zones() as $zone) {
            $model = DeliveryZone::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $zone['name']],
                [
                    'branch_id' => $primary->getKey(),
                    'fee' => $zone['fee'],
                    'min_order' => $zone['min_order'],
                    'is_active' => true,
                ],
            );

            $zones[] = [
                'id' => $model->getKey(),
                'name' => (string) $model->name,
                'fee' => (float) $model->fee,
                'min_order' => (float) $model->min_order,
            ];
        }

        return $zones;
    }
}
