<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\Menu\Models\Product;
use App\Domain\POS\SaleService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Profiles ONE sale and groups its queries by normalised SQL, so optimisation
 * targets the real hotspot rather than a guess. *_qa only, writes one order.
 */
class QaProfileSale extends Command
{
    protected $signature = 'qa:profile-sale {--items=2}';

    protected $description = 'Break down the queries in a single POS sale';

    public function handle(SaleService $sales): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $tenant = Tenant::withoutGlobalScopes()->orderBy('id')->first();
        app(TenantContext::class)->set($tenant);

        $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();
        $user = User::query()->where('tenant_id', $tenant->id)->first();
        $products = Product::withoutGlobalScopes()->where('tenant_id', $tenant->id)->limit(5)->pluck('id')->all();
        $methodId = (int) DB::table('payment_methods')->where('tenant_id', $tenant->id)->where('code', 'cash')->value('id');

        $items = [];
        for ($i = 0; $i < (int) $this->option('items'); $i++) {
            $items[] = ['product_id' => $products[$i % count($products)], 'quantity' => 1];
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        $sales->place([
            'branch_id' => $branch->id,
            'order_type' => 'counter',
            'items' => $items,
            'payments' => [['payment_method_id' => $methodId, 'amount' => 99999, 'tendered' => 99999]],
            'idempotency_key' => 'profile-'.uniqid('', true),
        ], $user, $branch);

        $log = DB::getQueryLog();
        DB::disableQueryLog();

        // Normalise: strip literals so identical shapes group together.
        $groups = [];
        foreach ($log as $entry) {
            $sql = preg_replace('/\?/', '?', $entry['query']);
            $sql = preg_replace("/\b\d+\b/", 'N', $sql);
            $sql = preg_replace("/'[^']*'/", '?', $sql);
            $sql = preg_replace('/\s+/', ' ', trim($sql));
            $key = mb_substr($sql, 0, 110);
            $groups[$key] = ($groups[$key] ?? 0) + 1;
        }

        arsort($groups);

        $rows = [];
        foreach ($groups as $sql => $count) {
            $rows[] = [$count, $sql];
        }

        $this->table(['count', 'query shape'], array_slice($rows, 0, 25));

        $this->line('TOTAL QUERIES: '.count($log));

        return self::SUCCESS;
    }
}
