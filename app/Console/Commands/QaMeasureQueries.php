<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Reporting\ReportService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Measures query count and wall time for the hot read paths identified in the
 * static audit, against the QA dataset. Read-only.
 */
class QaMeasureQueries extends Command
{
    protected $signature = 'qa:measure-queries {--tenants=5 : How many tenants to sample}';

    protected $description = 'Measure query counts and latency for hot read paths (read-only)';

    public function handle(ReportService $reports): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $tenants = Tenant::withoutGlobalScopes()->orderBy('id')->limit((int) $this->option('tenants'))->get();
        $rows = [];

        foreach ($tenants as $tenant) {
            app(TenantContext::class)->set($tenant);

            $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->first();
            if (! $branch) {
                continue;
            }

            $period = ReportPeriod::forPreset('month', $branch->getKey(), $tenant, $branch);

            $rows[] = $this->measure("report:sales t#{$tenant->getKey()}", fn () => $reports->sales($period));
            $rows[] = $this->measure("report:products t#{$tenant->getKey()}", fn () => $reports->products($period));
            $rows[] = $this->measure("report:cash t#{$tenant->getKey()}", fn () => $reports->cash($period));
            $rows[] = $this->measure("report:inventory t#{$tenant->getKey()}", fn () => $reports->inventory($period));
            $rows[] = $this->measure("report:staff t#{$tenant->getKey()}", fn () => $reports->staff($period));
        }

        $this->table(['Path', 'Queries', 'ms'], $rows);

        return self::SUCCESS;
    }

    /** @return array{0: string, 1: int, 2: string} */
    protected function measure(string $label, callable $fn): array
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $start = microtime(true);

        try {
            $fn();
        } catch (\Throwable $e) {
            DB::disableQueryLog();

            return [$label.' ERROR', 0, substr($e->getMessage(), 0, 40)];
        }

        $ms = (microtime(true) - $start) * 1000;
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return [$label, $count, number_format($ms, 1)];
    }
}
