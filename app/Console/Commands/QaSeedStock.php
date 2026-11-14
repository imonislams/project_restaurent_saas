<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Console\Command;

/**
 * Gives the QA dataset realistic stock: tracked products, opening balances and
 * movements, so inventory reports and stock paths are exercised. *_qa only.
 */
class QaSeedStock extends Command
{
    protected $signature = 'qa:seed-stock {--tracked=40 : Products per tenant that track stock}';

    protected $description = 'Add realistic stock balances/movements to the QA dataset';

    public function handle(StockService $stock): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $tracked = (int) $this->option('tracked');
        $tenants = Tenant::withoutGlobalScopes()->orderBy('id')->get();

        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        $balances = 0;

        foreach ($tenants as $tenant) {
            app(TenantContext::class)->set($tenant);

            $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->first();
            if (! $branch) {
                $bar->advance();

                continue;
            }

            $location = StockLocation::withoutGlobalScopes()
                ->where('tenant_id', $tenant->getKey())
                ->where('branch_id', $branch->getKey())
                ->first()
                ?? app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);

            $products = Product::withoutGlobalScopes()
                ->where('tenant_id', $tenant->getKey())
                ->limit($tracked)->get();

            foreach ($products as $product) {
                $product->forceFill(['inventory_mode' => InventoryMode::Product])->save();

                try {
                    $stock->record(
                        $product,
                        $location,
                        100,
                        StockMovementReason::Opening,
                    );
                    $balances++;
                } catch (\Throwable $e) {
                    $this->newLine();
                    $this->warn('skip: '.get_class($e).' :: '.$e->getMessage());
                }
            }

            $bar->advance();
            gc_collect_cycles();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(['Metric', 'Value'], [
            ['stock balances written', $balances],
            ['stock_balances rows', \DB::table('stock_balances')->count()],
            ['stock_movements rows', \DB::table('stock_movements')->count()],
            ['tracked products', \DB::table('products')->where('inventory_mode', '<>', 'none')->count()],
        ]);

        return self::SUCCESS;
    }
}
