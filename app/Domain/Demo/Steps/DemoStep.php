<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Demo\DemoRun;

/**
 * One unit of demo generation, executed as its own request so progress is
 * visible and the work stays inside PHP's time limit.
 */
interface DemoStep
{
    /** Stable identifier, also stored in the batch's completed-step list. */
    public function key(): string;

    /** Human label shown on the progress screen. */
    public function label(): string;

    /**
     * Create this step's records.
     *
     * @return array<string, int|float> counters to add to the batch totals
     */
    public function run(DemoRun $run): array;
}
