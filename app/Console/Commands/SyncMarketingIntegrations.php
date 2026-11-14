<?php

namespace App\Console\Commands;

use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Jobs\SyncMarketingIntegrationJob;
use Illuminate\Console\Command;

/** Queues a sync for every connected provider that supplies reporting data. */
class SyncMarketingIntegrations extends Command
{
    protected $signature = 'marketing:sync-integrations';

    protected $description = 'Queue a data sync for each connected marketing integration';

    public function handle(MarketingIntegrationService $integrations): int
    {
        $queued = 0;

        foreach (MarketingIntegrationRegistry::keys() as $provider) {
            if (! MarketingIntegrationRegistry::syncsData($provider)) {
                continue;
            }

            // Only a verified, switched-on integration is asked for data.
            if (! $integrations->connected($provider)) {
                continue;
            }

            SyncMarketingIntegrationJob::dispatch($provider);
            $queued++;
        }

        $this->info($queued.' sync(s) queued.');

        return self::SUCCESS;
    }
}
