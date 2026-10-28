<?php

namespace App\Domain\Demo;

use App\Domain\Demo\Models\DemoDataRecord;
use Illuminate\Database\Eloquent\Model;

/**
 * Records every row a demo batch creates into the ledger, in bulk.
 *
 * Most rows are captured automatically by the global `eloquent.created`
 * listener while a batch is active — including rows written indirectly by the
 * domain services (payments, cash movements, stock movements, tickets, …).
 * Models without the tenant trait (users, roles) are remembered explicitly.
 */
class DemoRecorder
{
    /** Rows buffered before a bulk insert. */
    public const FLUSH_AT = 400;

    /** @var array<string, list<int>> model type => ids */
    protected array $buffer = [];

    protected int $buffered = 0;

    protected int $total = 0;

    public function __construct(protected DemoContext $context) {}

    public function remember(?Model $model): void
    {
        if ($model === null || $model->getKey() === null || ! $this->context->active()) {
            return;
        }

        $this->buffer[$model->getMorphClass()][] = (int) $model->getKey();

        if (++$this->buffered >= self::FLUSH_AT) {
            $this->flush();
        }
    }

    public function flush(): void
    {
        $batch = $this->context->batch();

        if ($batch === null || $this->buffer === []) {
            $this->buffer = [];
            $this->buffered = 0;

            return;
        }

        $rows = [];
        $now = now()->toDateTimeString();

        foreach ($this->buffer as $type => $ids) {
            foreach (array_unique($ids) as $id) {
                $rows[] = [
                    'batch_id' => $batch->getKey(),
                    'tenant_id' => $batch->tenant_id,
                    'model_type' => $type,
                    'model_id' => $id,
                    'created_at' => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DemoDataRecord::query()->insert($chunk);
        }

        $this->total += count($rows);
        $this->buffer = [];
        $this->buffered = 0;
    }

    /** Rows written to the ledger so far in this request. */
    public function count(): int
    {
        return $this->total + $this->buffered;
    }
}
