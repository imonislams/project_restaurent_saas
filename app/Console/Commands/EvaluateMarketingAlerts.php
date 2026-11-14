<?php

namespace App\Console\Commands;

use App\Domain\Marketing\Insights\InsightService;
use Illuminate\Console\Command;

class EvaluateMarketingAlerts extends Command
{
    protected $signature = 'marketing:evaluate-alerts';

    protected $description = 'Evaluate marketing alert rules and raise insights';

    public function handle(InsightService $insights): int
    {
        $result = $insights->evaluate();

        $this->info(sprintf('Evaluated %d rule(s), %d fired.', $result['evaluated'], $result['fired']));

        return self::SUCCESS;
    }
}
