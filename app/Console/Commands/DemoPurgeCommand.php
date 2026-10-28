<?php

namespace App\Console\Commands;

use App\Domain\Demo\DemoDataService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Console\Command;

/**
 * Removes every record a tenant's demo runs created. Real records — the owner's
 * own sales, staff, branches and configuration — are never touched, because
 * removal replays the demo ledger rather than guessing from table contents.
 */
class DemoPurgeCommand extends Command
{
    protected $signature = 'demo:purge
        {tenant? : Tenant id or slug (defaults to the only/first tenant)}
        {--force : Skip the confirmation prompt}';

    protected $description = 'Remove all demo data generated for a tenant (real records are untouched)';

    public function handle(DemoDataService $demo, TenantContext $context): int
    {
        $tenant = $this->resolveTenant();

        if ($tenant === null) {
            $this->error('No tenant found. Pass a tenant id or slug.');

            return self::FAILURE;
        }

        $context->set($tenant);

        $state = $demo->state($tenant);

        if (! ($state['has_data'] ?? false) || ($state['records'] ?? 0) === 0) {
            $this->info(sprintf('No demo data to remove for "%s".', $tenant->name));

            return self::SUCCESS;
        }

        $this->line(sprintf(
            'Tenant "%s" (#%d) has %d tracked demo rows from %d day(s) of sample data.',
            $tenant->name,
            $tenant->getKey(),
            $state['records'],
            $state['days'],
        ));

        if (! $this->option('force') && ! $this->confirm('Remove all of this demo data?', true)) {
            $this->info('Nothing removed.');

            return self::SUCCESS;
        }

        try {
            $result = $demo->purge($tenant);
        } catch (\Throwable $e) {
            $this->error('Removal failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf('Removed %d demo rows across %d run(s).', $result['records'], $result['batches']));

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
