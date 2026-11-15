<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\ProductVariant;
use App\Domain\POS\SaleService;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Purchasing\Models\PurchaseOrderItem;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Fills the gaps in the QA load-test dataset: order history for every tenant,
 * product variants, purchase orders and loyalty accounts.
 *
 * Resumable per tenant range so a long run can be split into safe batches.
 * Refuses to run outside a *_qa database.
 */
class QaCompleteDataset extends Command
{
    protected $signature = 'qa:complete-dataset
        {--from=1 : First tenant id}
        {--to=100 : Last tenant id}
        {--orders=150 : Sales per tenant}
        {--variants=3 : Variants per product (0 to skip)}
        {--pos=12 : Purchase orders per tenant}
        {--loyalty=1 : Create loyalty accounts (1/0)}';

    protected $description = 'Complete the QA dataset: orders for all tenants, variants, POs, loyalty';

    public function handle(SaleService $sales): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $from = (int) $this->option('from');
        $to = (int) $this->option('to');

        $tenants = Tenant::withoutGlobalScopes()
            ->whereBetween('id', [$from, $to])
            ->orderBy('id')
            ->get();

        $this->info(sprintf(
            'Completing dataset for tenants %d–%d (%d found)',
            $from, $to, $tenants->count(),
        ));

        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        $stats = ['variants' => 0, 'orders' => 0, 'failed' => 0, 'pos' => 0, 'loyalty' => 0];

        foreach ($tenants as $tenant) {
            app(TenantContext::class)->set($tenant);

            $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->first();
            $user = User::query()->where('tenant_id', $tenant->getKey())->first();

            if (! $branch || ! $user) {
                $bar->advance();

                continue;
            }

            $this->variantise($tenant, (int) $this->option('variants'), $stats);
            $this->purchaseOrders($tenant, $branch, $user, (int) $this->option('pos'), $stats);
            $this->loyalty($tenant, (int) $this->option('loyalty'), $stats);
            $this->sales($tenant, $branch, $user, $sales, (int) $this->option('orders'), $stats);

            TenantContext::class && app(TenantContext::class)->forget();
            $bar->advance();
            gc_collect_cycles();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(['Metric', 'Value'], [
            ['variants created', number_format($stats['variants'])],
            ['purchase orders', number_format($stats['pos'])],
            ['loyalty accounts', number_format($stats['loyalty'])],
            ['sales created', number_format($stats['orders'])],
            ['sales failed', number_format($stats['failed'])],
        ]);

        return self::SUCCESS;
    }

    /** @param array<string,int> $stats */
    protected function variantise(Tenant $tenant, int $perProduct, array &$stats): void
    {
        if ($perProduct < 1) {
            return;
        }

        $products = Product::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->whereDoesntHave('variants')
            ->limit(60)
            ->get();

        $labels = [['Small', 0.8], ['Regular', 1.0], ['Large', 1.25]];

        foreach ($products as $product) {
            foreach (array_slice($labels, 0, $perProduct) as $i => [$label, $factor]) {
                ProductVariant::create([
                    'tenant_id' => $tenant->getKey(),
                    'product_id' => $product->getKey(),
                    'name' => $label,
                    'sku' => ($product->sku ?: 'P'.$product->getKey()).'-'.strtoupper(substr($label, 0, 1)),
                    'price' => round((float) $product->price_dine_in * $factor, 2),
                    'is_default' => $i === 1 || ($perProduct === 1 && $i === 0),
                    'sort_order' => $i,
                ]);
                $stats['variants']++;
            }
        }
    }

    /** @param array<string,int> $stats */
    protected function purchaseOrders(Tenant $tenant, Branch $branch, User $user, int $count, array &$stats): void
    {
        if ($count < 1) {
            return;
        }

        $suppliers = Supplier::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->limit(5)->get();

        $ingredients = Ingredient::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->limit(40)->get();

        if ($suppliers->isEmpty() || $ingredients->isEmpty()) {
            return;
        }

        $statuses = ['draft', 'submitted', 'approved', 'received'];

        for ($i = 0; $i < $count; $i++) {
            $subtotal = 0.0;
            $lines = [];

            foreach ($ingredients->random(min(4, $ingredients->count())) as $ingredient) {
                $qty = random_int(5, 50);
                $cost = (float) ($ingredient->cost_per_unit ?: random_int(10, 200) / 10);
                $line = round($qty * $cost, 2);
                $subtotal += $line;

                $lines[] = [
                    'tenant_id' => $tenant->getKey(),
                    'item_type' => 'ingredient',
                    'item_id' => $ingredient->getKey(),
                    'description' => $ingredient->name,
                    'quantity' => $qty,
                    'received_quantity' => 0,
                    'unit_cost' => $cost,
                    'line_total' => $line,
                ];
            }

            if ($lines === []) {
                continue;
            }

            $status = $statuses[$i % count($statuses)];

            $order = PurchaseOrder::create([
                'tenant_id' => $tenant->getKey(),
                'branch_id' => $branch->getKey(),
                'supplier_id' => $suppliers[$i % $suppliers->count()]->getKey(),
                'number' => 'PO-'.now()->format('Ymd').'-'.$tenant->getKey().'-'.($i + 1),
                'status' => $status,
                'subtotal' => round($subtotal, 2),
                'total' => round($subtotal, 2),
                'notes' => 'QA dataset',
                'created_by' => $user->getKey(),
                'ordered_at' => now()->subDays(random_int(1, 60)),
                'expected_at' => now()->addDays(random_int(1, 14)),
            ]);

            foreach ($lines as $line) {
                $line['purchase_order_id'] = $order->getKey();
                PurchaseOrderItem::create($line);
            }

            $stats['pos']++;
        }
    }

    /** @param array<string, int> $stats */
    protected function loyalty(Tenant $tenant, int $enabled, array &$stats): void
    {
        if ($enabled < 1) {
            return;
        }

        $customers = Customer::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->whereDoesntHave('loyaltyAccount')
            ->limit(100)->get();

        foreach ($customers as $customer) {
            LoyaltyAccount::create([
                'tenant_id' => $tenant->getKey(),
                'customer_id' => $customer->getKey(),
                'points_balance' => random_int(0, 500),
            ]);
            $stats['loyalty']++;
        }
    }

    /** @param array<string,int> $stats */
    protected function sales(Tenant $tenant, Branch $branch, User $user, SaleService $sales, int $count, array &$stats): void
    {
        if ($count < 1) {
            return;
        }

        $products = Product::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->limit(40)->pluck('id')->all();

        $customers = Customer::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->limit(50)->pluck('id')->all();

        $methodId = (int) DB::table('payment_methods')
            ->where('tenant_id', $tenant->getKey())
            ->where('code', 'cash')
            ->value('id');

        if ($products === [] || $methodId === 0) {
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            $picks = (array) array_rand(array_flip($products), min(3, count($products)));
            $items = [];

            foreach ($picks as $productId) {
                $items[] = ['product_id' => $productId, 'quantity' => random_int(1, 3)];
            }

            try {
                $sales->place([
                    'branch_id' => $branch->getKey(),
                    'order_type' => 'counter',
                    'items' => $items,
                    'payments' => [[
                        'payment_method_id' => $methodId,
                        'amount' => 99999,
                        'tendered' => 99999,
                    ]],
                    'customer_id' => $customers === [] ? null : $customers[array_rand($customers)],
                    'idempotency_key' => 'qa2-'.$tenant->getKey().'-'.$i.'-'.uniqid(),
                ], $user, $branch);

                $stats['orders']++;
            } catch (\Throwable $e) {
                $stats['failed']++;
            }
        }
    }
}
