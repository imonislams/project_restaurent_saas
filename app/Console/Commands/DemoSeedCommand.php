<?php

namespace App\Console\Commands;

use App\Domain\Demo\DemoDataService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Console\Command;

/**
 * Generates (or resumes) a tenant's demo workspace from the CLI — the same
 * service the browser progress screen drives, so both paths produce identical
 * data. Handy on hosts where the owner prefers the command runner.
 */
class DemoSeedCommand extends Command
{
    protected $signature = 'demo:seed
        {tenant? : Tenant id or slug (defaults to the only/first tenant)}
        {--days=21 : Days of sales history to generate (15-60)}
        {--fresh : Remove any existing demo data first}';

    protected $description = 'Generate a complete demo workspace for a tenant (menu, team, inventory, sales history)';

    public function handle(DemoDataService $demo, TenantContext $context): int
    {
        $tenant = $this->resolveTenant();

        if ($tenant === null) {
            $this->error('No tenant found. Pass a tenant id or slug.');

            return self::FAILURE;
        }

        $context->set($tenant);

        $this->info(sprintf('Generating demo data for "%s" (#%d)…', $tenant->name, $tenant->getKey()));

        if ($this->option('fresh')) {
            $removed = $demo->purge($tenant);
            $this->line(sprintf('Removed previous demo data: %d rows across %d run(s).', $removed['records'], $removed['batches']));
        }

        $batch = $demo->start($tenant, null, (int) $this->option('days'));

        $bar = $this->output->createProgressBar(max(1, $batch->steps_total));
        $bar->start();

        try {
            while ($batch->isActive()) {
                $batch = $demo->runNextStep($batch);
                $bar->setProgress($batch->steps_done);
                gc_collect_cycles();
            }
        } catch (\Throwable $e) {
            $bar->finish();
            $this->newLine(2);
            $this->error('Demo generation failed: '.$e->getMessage());
            $this->line('Everything already created is kept and traced, so running this command again resumes the run.');

            return self::FAILURE;
        }

        $bar->finish();
        $this->newLine(2);

        $rows = collect($batch->counts ?? [])
            ->map(fn ($value, $key) => [$key, is_float($value) ? round($value, 2) : $value])
            ->values()
            ->all();

        if ($rows !== []) {
            $this->table(['Metric', 'Value'], $rows);
        }

        $this->info('Demo data is ready.');

        return self::SUCCESS;
    }

    protected function resolveTenant(): ?Tenant
    {
        $key = $this->argument('tenant');

        if ($key === null || $key === '') {
            return Tenant::query()->orderBy('id')->first();
        }

        return Tenant::query()
            ->when(is_numeric($key), fn ($query) => $query->whereKey((int) $key))
            ->when(! is_numeric($key), fn ($query) => $query->where('slug', $key))
            ->first();
    }
}
