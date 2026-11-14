<?php

namespace App\Console\Commands;

use App\Domain\Marketing\Analytics\AttributionService;
use Illuminate\Console\Command;

/**
 * Recomputes attributed revenue from settled invoices.
 *
 * Attribution is written once, when a customer registers — but their revenue accrues
 * afterwards. Without this, a customer who renews keeps the first invoice's value.
 */
class RefreshMarketingAttribution extends Command
{
    protected $signature = 'marketing:refresh-attribution';

    protected $description = 'Recompute marketing attribution values from settled invoices';

    public function handle(AttributionService $attribution): int
    {
        $this->info($attribution->refreshAll().' customer attribution(s) refreshed.');

        return self::SUCCESS;
    }
}
