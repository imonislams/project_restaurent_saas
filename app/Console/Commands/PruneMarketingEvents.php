<?php

namespace App\Console\Commands;

use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingVisitor;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Applies the documented retention windows.
 *
 * Events and visitors age out of `consent.retention_days`; consent records are pruned
 * by ConsentService itself. Pruning is a policy the operator sets, not a guess.
 */
class PruneMarketingEvents extends Command
{
    protected $signature = 'marketing:prune-events';

    protected $description = 'Delete marketing events and visitors past the retention window';

    public function handle(ConsentService $consent): int
    {
        $cutoff = Carbon::now()->subDays($consent->retentionDays());

        $events = MarketingEvent::query()->where('occurred_at', '<', $cutoff)->delete();
        $visitors = MarketingVisitor::query()->where('last_seen_at', '<', $cutoff)->delete();
        $consents = $consent->prune();

        $this->info(sprintf('Pruned %d event(s), %d visitor(s) and %d consent record(s) older than %d days.', $events, $visitors, $consents, $consent->retentionDays()));

        return self::SUCCESS;
    }
}
