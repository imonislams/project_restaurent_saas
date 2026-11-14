<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Menu\Models\Product;
use App\Domain\POS\SaleService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Generates POS trade history for the QA dataset via the real SaleService, so
 * orders, payments, stock movements, invoices and kitchen tickets are all real.
 * Refuses to run outside a *_qa database.
 */
class QaSeedTrade extends Command
{
    protected $signature = 'qa:seed-trade
        {--orders-per-tenant=200 : Completed sales per tenant}
        {--tenants= : Limit to the first N tenants}';

    protected $description = 'Generate POS trade history for the QA dataset';

    public function handle(SaleService $sales): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $perTenant = (int) $this->option('orders-per-tenant');
        $limit = $this->option('tenants');

        $query = Tenant::withoutGlobalScopes()->orderBy('id');
        if ($limit !== null) {
            $query->limit((int) $limit);
        }
        $tenants = $query->get();

        $this->info(sprintf('Generating %d sales per tenant across %d tenants…', $perTenant, $tenants->count()));

        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        $created = 0;
        $failed = 0;

        foreach ($tenants as $tenant) {
            app(TenantContext::class)->set($tenant);

            $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->first();
            $user = User::query()->where('tenant_id', $tenant->getKey())->first();

            if (! $branch || ! $user) {
                $bar->advance();

                continue;
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
                $bar->advance();

                continue;
            }

            for ($i = 0; $i < $perTenant; $i++) {
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
                        'idempotency_key' => 'qa-'.$tenant->getKey().'-'.$i.'-'.uniqid(),
                    ], $user, $branch);
                    $created++;
                } catch (\Throwable $e) {
                    $failed++;
                }
            }

            $bar->advance();
            gc_collect_cycles();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(['Metric', 'Value'], [
            ['sales created', $created],
            ['sales failed', $failed],
            ['orders', DB::table('orders')->count()],
            ['order_items', DB::table('order_items')->count()],
            ['payments', DB::table('payments')->count()],
            ['stock_movements', DB::table('stock_movements')->count()],
        ]);

        return self::SUCCESS;
    }
}
