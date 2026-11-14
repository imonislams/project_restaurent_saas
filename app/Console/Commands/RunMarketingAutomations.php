<?php

namespace App\Console\Commands;

use App\Domain\Marketing\Automation\AutomationService;
use Illuminate\Console\Command;

/**
 * Advances every due automation enrolment by one step.
 *
 * Run from the scheduler rather than inline on a request: a workflow that sends on a
 * delay cannot be driven by a page view, and a failing step must not break anything a
 * customer is doing.
 */
class RunMarketingAutomations extends Command
{
    protected $signature = 'marketing:run-automations {--limit=200}';

    protected $description = 'Advance due marketing automation enrolments';

    public function handle(AutomationService $automations): int
    {
        $result = $automations->run((int) $this->option('limit'));

        $this->info(sprintf(
            'Processed %d enrolment(s): %d step(s) executed, %d skipped.',
            $result['processed'],
            $result['sent'],
            $result['skipped'],
        ));

        return self::SUCCESS;
    }
}
