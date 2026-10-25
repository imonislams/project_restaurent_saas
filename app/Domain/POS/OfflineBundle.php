<?php

namespace App\Domain\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;

/**
 * The catalogue snapshot the POS needs in order to keep selling without a network.
 *
 * The same builder feeds the POS page's initial props and GET /pos/offline-bundle,
 * so the online and offline shapes are identical and there is one place that defines
 * them. Prices are mirrored verbatim — the browser never derives a price of its own.
 */
class OfflineBundle
{
    /**
     * @return array<string, mixed>
     */
    public function build(?Branch $branch, Tenant $tenant): array
    {
        return [
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
                    'image_url' => $product->image_url,
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
            'tables' => $branch
                ? $branch->tables()->where('is_active', true)->with('staff:id,name')->orderBy('sort_order')->orderBy('name')->get()
                    ->map(fn ($table) => [
                        'id' => $table->getKey(),
                        'name' => $table->name,
                        'seats' => $table->seats,
                        'status' => $table->status->value,
                        'staff' => $table->staff->map(fn ($user) => [
                            'id' => $user->getKey(),
                            'name' => $user->name,
                        ])->values(),
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

            // Pricing and validation settings the offline client must apply.
            'taxInclusive' => (bool) $tenant->getSetting('tax.inclusive', false),
            'taxRate' => (float) $tenant->getSetting('tax.rate', 0),
            'serviceChargeRate' => (float) $tenant->getSetting('service_charge.rate', 0),
            'allowPartialPayment' => (bool) $tenant->getSetting('pos.allow_partial', false),
            'requireTableForDineIn' => (bool) $tenant->getSetting('pos.require_table_for_dine_in', true),
            'blockSaleWhenInsufficient' => (bool) $tenant->getSetting('inventory.block_sale_when_insufficient', false),
            // Null means no discount needs approval; anything above this percentage
            // needs a manager PIN, which is verified server-side — so the offline
            // POS must refuse it rather than collect an unverifiable PIN.
            'discountApprovalPercent' => $tenant->getSetting('pos.discount_approval_percent') !== null
                ? (float) $tenant->getSetting('pos.discount_approval_percent')
                : null,
            // How long a device may keep selling since it last reached the server.
            'offlineMaxHours' => (int) config('pos.offline.max_hours', 12),
        ];
    }

    /**
     * A cheap fingerprint of everything in the bundle. The client keeps this with
     * its cached copy and refreshes when it changes.
     */
    public function version(?Branch $branch, Tenant $tenant): string
    {
        $parts = [
            Product::query()->max('updated_at'),
            Product::query()->max('id'),
            Category::query()->max('updated_at'),
            Customer::query()->max('updated_at'),
            $tenant->paymentMethods()->max('updated_at'),
            $tenant->updated_at?->toIso8601String(),
            $branch?->updated_at?->toIso8601String(),
            $branch?->tables()->max('updated_at'),
            (string) $tenant->getSetting('tax.rate', 0),
            (string) $tenant->getSetting('tax.inclusive', false),
            (string) $tenant->getSetting('service_charge.rate', 0),
        ];

        return substr(md5(implode('|', $parts)), 0, 16);
    }
}
