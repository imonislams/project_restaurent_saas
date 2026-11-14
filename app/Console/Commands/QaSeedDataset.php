<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Customers\Models\Customer;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * QA load-test dataset builder. Additive only; refuses to run outside the
 * dedicated QA database. Never touches data it did not create.
 */
class QaSeedDataset extends Command
{
    protected $signature = 'qa:seed-dataset
        {tenants=10 : Number of tenants to create}
        {--products=100 : Products per tenant}
        {--per-tenant-branches=2}
        {--customers=50}
        {--suppliers=10}
        {--ingredients=40}';

    protected $description = 'Build an isolated load-test dataset in the QA database';

    public function handle(): int
    {
        if (! $this->isQaDatabase()) {
            $this->error('Refusing to run: DB_DATABASE is not a QA database. This command only writes to *_qa.');

            return self::FAILURE;
        }

        $tenants = (int) $this->argument('tenants');
        $products = (int) $this->option('products');
        $branchesPer = (int) $this->option('per-tenant-branches');
        $customers = (int) $this->option('customers');
        $suppliers = (int) $this->option('suppliers');
        $ingredients = (int) $this->option('ingredients');

        $this->info(sprintf(
            'Building %d tenants x %d products (%d total) in %s',
            $tenants, $products, $tenants * $products, config('database.connections.mysql.database'),
        ));

        $bar = $this->output->createProgressBar($tenants);
        $bar->start();

        for ($i = 1; $i <= $tenants; $i++) {
            $this->buildTenant("QA Restaurant {$i}", $products, $branchesPer, $customers, $suppliers, $ingredients);
            $bar->advance();
            gc_collect_cycles();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(['Metric', 'Value'], [
            ['tenants', Tenant::withoutGlobalScopes()->count()],
            ['users', User::query()->count()],
            ['branches', Branch::withoutGlobalScopes()->count()],
            ['products', Product::withoutGlobalScopes()->count()],
            ['categories', Category::withoutGlobalScopes()->count()],
            ['ingredients', Ingredient::withoutGlobalScopes()->count()],
            ['customers', Customer::withoutGlobalScopes()->count()],
            ['suppliers', Supplier::withoutGlobalScopes()->count()],
        ]);

        return self::SUCCESS;
    }

    protected function isQaDatabase(): bool
    {
        $name = (string) config('database.connections.mysql.database');

        return str_ends_with($name, '_qa');
    }

    protected function buildTenant(
        string $name,
        int $products,
        int $branches,
        int $customers,
        int $suppliers,
        int $ingredients,
    ): void {
        DB::transaction(function () use ($name, $products, $branches, $customers, $suppliers, $ingredients) {
            $tenant = Tenant::factory()->create(['name' => $name]);
            $tenant->mergeSettings([
                'tax' => ['rate' => 5, 'inclusive' => false],
                'pos.require_table_for_dine_in' => false,
            ]);
            $tenant->save();

            app(TenantContext::class)->set($tenant);

            app(ProvisionInventoryDefaults::class)->forTenant($tenant);
            app(ProvisionPaymentDefaults::class)->forTenant($tenant);

            $firstBranch = null;
            for ($b = 1; $b <= $branches; $b++) {
                $branch = Branch::factory()->create([
                    'tenant_id' => $tenant->getKey(),
                    'code' => 'B'.$b,
                ]);
                app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);
                $firstBranch ??= $branch;
            }

            $owner = User::factory()->forTenant($tenant)->create([
                'name' => $name.' Owner',
                'email' => 'owner'.Str::lower(Str::random(6)).'@qa.test',
                'password' => Hash::make('password'),
            ]);
            $owner->assignRole(RoleName::TenantOwner);
            $owner->syncBranchAccess([$firstBranch->getKey()]);

            $cashier = User::factory()->forTenant($tenant)->create([
                'name' => $name.' Cashier',
                'password' => Hash::make('password'),
            ]);
            $cashier->assignRole(RoleName::Cashier);
            $cashier->syncBranchAccess([$firstBranch->getKey()]);

            $this->buildCatalogue($tenant, $products, $ingredients);
            $this->buildTrade($tenant, $customers, $suppliers);
            $this->openShift($firstBranch, $owner);

            TenantContext::class && app(TenantContext::class)->forget();
        });
    }

    protected function buildCatalogue(Tenant $tenant, int $products, int $ingredientCount): void
    {
        $categories = [];
        for ($c = 1; $c <= 8; $c++) {
            $categories[] = Category::factory()->create([
                'tenant_id' => $tenant->getKey(),
                'name' => 'Category '.$c,
                'slug' => 'cat-'.$c.'-'.Str::lower(Str::random(4)),
            ])->getKey();
        }

        for ($i = 1; $i <= $ingredientCount; $i++) {
            Ingredient::create([
                'tenant_id' => $tenant->getKey(),
                'name' => 'Ingredient '.$i,
                'cost_per_unit' => random_int(10, 500) / 10,
            ]);
        }

        for ($p = 1; $p <= $products; $p++) {
            Product::factory()->create([
                'tenant_id' => $tenant->getKey(),
                'category_id' => $categories[$p % count($categories)],
                'name' => 'Product '.$p,
                'slug' => 'product-'.$p.'-'.Str::lower(Str::random(4)),
                'sku' => 'SKU-'.$p.'-'.Str::lower(Str::random(4)),
                'price_dine_in' => random_int(100, 2000) / 10,
                'price_takeaway' => random_int(100, 2000) / 10,
                'price_delivery' => random_int(100, 2000) / 10,
                'cost_price' => random_int(50, 1000) / 10,
            ]);
        }
    }

    protected function buildTrade(Tenant $tenant, int $customerCount, int $supplierCount): void
    {
        for ($c = 1; $c <= $customerCount; $c++) {
            Customer::create([
                'tenant_id' => $tenant->getKey(),
                'name' => 'Customer '.$c,
                'phone' => '017'.str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT),
            ]);
        }

        for ($s = 1; $s <= $supplierCount; $s++) {
            Supplier::create([
                'tenant_id' => $tenant->getKey(),
                'name' => 'Supplier '.$s,
                'phone' => '019'.str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT),
            ]);
        }
    }

    protected function openShift(Branch $branch, User $owner): void
    {
        try {
            app(ShiftService::class)->open($branch, $owner, 500.0);
        } catch (\Throwable $e) {
            $this->newLine();
            $this->warn('Shift open skipped: '.$e->getMessage());
        }
    }
}
