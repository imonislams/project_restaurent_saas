<?php

namespace App\Domain\Orders;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Enums\BillingMode;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Invoicing\Enums\InvoiceStatus;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Finds the order a new submission may be appended to. A table being occupied
 * is not proof of an eligible order, so every rule below is checked explicitly.
 */
class ActiveOrderResolver
{
    public function forQrSession(DiningSession $session, DiningParticipant $participant): ?Order
    {
        $query = $this->base($session->branch_id)
            ->where('dining_session_id', $session->getKey());

        if ($session->billing_mode === BillingMode::Individual) {
            $query->where('dining_participant_id', $participant->getKey());
        }

        return $query->latest('id')->first();
    }

    public function forTable(Branch $branch, int $tableId): ?Order
    {
        $session = DiningSession::query()
            ->where('branch_id', $branch->getKey())
            ->where('table_id', $tableId)
            ->whereIn('status', $this->activeSessionStatuses())
            ->latest('id')
            ->first();

        $query = $this->base($branch->getKey());

        if ($session) {
            $query->where('dining_session_id', $session->getKey());
        } else {
            $query->whereNull('dining_session_id')->where('table_id', $tableId);
        }

        return $query->latest('id')->first();
    }

    public function isEligible(Order $order): bool
    {
        if ($order->status !== OrderStatus::Held) {
            return false;
        }

        if ($order->acceptance_status === AcceptanceStatus::Rejected) {
            return false;
        }

        if ($order->trashed()) {
            return false;
        }

        $session = $order->diningSession;

        if ($session && ! in_array($session->status->value, $this->activeSessionStatuses(), true)) {
            return false;
        }

        return ! $this->hasFinalizedInvoice($order);
    }

    protected function base(int $branchId): Builder
    {
        return Order::query()
            ->where('branch_id', $branchId)
            ->where('status', OrderStatus::Held->value)
            ->where('acceptance_status', '!=', AcceptanceStatus::Rejected->value)
            ->where(function (Builder $query): void {
                $query->whereNull('dining_session_id')
                    ->orWhereHas('diningSession', fn (Builder $session) => $session
                        ->whereIn('status', $this->activeSessionStatuses()));
            })
            ->whereNotIn('orders.id', function ($query): void {
                $query->select('invoice_orders.order_id')
                    ->from('invoice_orders')
                    ->join('invoices', 'invoices.id', '=', 'invoice_orders.invoice_id')
                    ->whereIn('invoices.status', [
                        InvoiceStatus::Paid->value,
                        InvoiceStatus::Void->value,
                    ]);
            });
    }

    protected function hasFinalizedInvoice(Order $order): bool
    {
        return DB::table('invoice_orders')
            ->join('invoices', 'invoices.id', '=', 'invoice_orders.invoice_id')
            ->where('invoice_orders.order_id', $order->getKey())
            ->whereIn('invoices.status', [InvoiceStatus::Paid->value, InvoiceStatus::Void->value])
            ->exists();
    }

    /**
     * Additions are allowed while the party is still ordering; once the bill is
     * being settled the order is frozen.
     *
     * @return list<string>
     */
    protected function activeSessionStatuses(): array
    {
        return [
            DiningSessionStatus::Open->value,
            DiningSessionStatus::BillRequested->value,
        ];
    }
}
