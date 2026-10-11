<?php

namespace App\Domain\Tables;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tables\Models\Table;

/**
 * Table lifecycle: a table is occupied while it has a non-final order, and
 * returns to available once every order at it is settled or voided.
 */
class TableService
{
    public function __construct(protected AuditLogger $audit) {}

    public function assign(Order $order, Table $table): void
    {
        $order->forceFill(['table_id' => $table->getKey()])->save();

        $this->refresh($table);
    }

    public function transfer(Order $order, Table $newTable): void
    {
        $old = $order->table;

        $order->forceFill(['table_id' => $newTable->getKey()])->save();

        if ($old && $old->getKey() !== $newTable->getKey()) {
            $this->refresh($old);
        }

        $this->refresh($newTable);

        $this->audit->log('table.order_transferred', $newTable, [
            'order_number' => $order->order_number,
        ]);
    }

    public function setStatus(Table $table, TableStatus $status): void
    {
        $table->forceFill(['status' => $status])->save();

        $this->audit->log('table.status_changed', $table, ['status' => $status->value]);
    }

    public function refresh(Table $table): void
    {
        if ($table->hasOpenOrders()) {
            if ($table->status !== TableStatus::Occupied) {
                $table->forceFill(['status' => TableStatus::Occupied])->save();
            }

            return;
        }

        if ($table->status === TableStatus::Occupied) {
            $table->forceFill(['status' => TableStatus::Available])->save();
        }
    }

    public function refreshForOrder(Order $order): void
    {
        if ($order->table) {
            $this->refresh($order->table);
        }
    }
}
