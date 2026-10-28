<?php

namespace App\Domain\Demo;

use App\Domain\Demo\Models\DemoDataBatch;

/**
 * Marks the demo batch currently being generated, for the lifetime of one
 * step. The ledger recorder reads it; outside a step it is always null, so the
 * recording hook costs a single boolean check on every other request.
 */
class DemoContext
{
    protected ?DemoDataBatch $batch = null;

    public function begin(DemoDataBatch $batch): void
    {
        $this->batch = $batch;
    }

    public function batch(): ?DemoDataBatch
    {
        return $this->batch;
    }

    public function active(): bool
    {
        return $this->batch !== null;
    }

    public function end(): void
    {
        $this->batch = null;
    }
}
