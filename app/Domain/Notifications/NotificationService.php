<?php

namespace App\Domain\Notifications;

use App\Domain\CashManagement\Models\Shift;
use App\Domain\Dining\Models\BillRequest;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Invoicing\Models\Invoice;
use App\Domain\Notifications\Notifications\BillRequestedNotification;
use App\Domain\Notifications\Notifications\LowStockNotification;
use App\Domain\Notifications\Notifications\OnlinePaymentReceivedNotification;
use App\Domain\Notifications\Notifications\OrderHandedOverNotification;
use App\Domain\Notifications\Notifications\OrderReadyNotification;
use App\Domain\Notifications\Notifications\OrderServedForBillingNotification;
use App\Domain\Notifications\Notifications\QrOrderPlacedNotification;
use App\Domain\Notifications\Notifications\SalesSummaryNotification;
use App\Domain\Notifications\Notifications\ShiftVarianceNotification;
use App\Domain\Notifications\Notifications\SubscriptionExpiringNotification;
use App\Domain\Orders\Models\Order;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * Sends operational notifications. Delivery is best-effort — a failure here must
 * never affect a committed sale.
 *
 * Order/kitchen/billing notifications are scoped to a single branch: a user only
 * receives them if they hold the relevant permission AND may access that branch.
 */
class NotificationService
{
    /** @return Collection<int, User> */
    public function recipients(Tenant $tenant): Collection
    {
        return $tenant->users()
            ->where('status', 'active')
            ->whereHas('roles', fn ($q) => $q->whereIn('slug', ['tenant_owner', 'tenant_admin']))
            ->get();
    }

    /**
     * Active users in the tenant who hold the permission and can access the branch.
     *
     * @return Collection<int, User>
     */
    public function branchRecipients(Tenant $tenant, int $branchId, string $permission): Collection
    {
        return $tenant->users()
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $user) => $user->hasPermission($permission)
                && ($user->hasTenantWideBranchAccess() || in_array($branchId, $user->accessibleBranchIds(), true)))
            ->values();
    }

    /** Active branch-scoped users allowed to approve orders. */
    public function approvalRecipients(Tenant $tenant, int $branchId): Collection
    {
        return $this->branchRecipients($tenant, $branchId, 'orders.approve');
    }

    /**
     * Staff responsible for fulfilling an order: the table's assigned staff,
     * falling back to the branch's approvers when none are assigned.
     *
     * @return Collection<int, User>
     */
    public function staffForOrder(Order $order): Collection
    {
        $assigned = $order->staff()
            ->where('status', 'active')
            ->where('users.tenant_id', $order->tenant_id)
            ->get();

        if ($assigned->isNotEmpty()) {
            return $assigned->values();
        }

        return $order->tenant ? $this->approvalRecipients($order->tenant, $order->branch_id) : collect();
    }

    /** Notify branch approvers that a QR order is waiting for confirmation. */
    public function newQrOrder(Order $order): int
    {
        $tenant = $order->tenant;

        if (! $tenant) {
            return 0;
        }

        $recipients = $this->approvalRecipients($tenant, $order->branch_id);

        Notification::send($recipients, new QrOrderPlacedNotification(
            $order->order_number,
            $order->table?->name ?? 'Table',
            (float) $order->total,
            $order->currency,
            $order->getKey(),
        ));

        return $recipients->count();
    }

    /** Notify assigned staff that the kitchen marked the food ready. */
    public function orderReady(Order $order): int
    {
        $recipients = $this->staffForOrder($order);

        Notification::send($recipients, new OrderReadyNotification(
            $order->order_number,
            $order->table?->name,
            $order->getKey(),
        ));

        return $recipients->count();
    }

    /** Notify assigned staff that the kitchen handed the order over. */
    public function orderHandedOver(Order $order): int
    {
        $recipients = $this->staffForOrder($order);

        Notification::send($recipients, new OrderHandedOverNotification(
            $order->order_number,
            $order->table?->name,
            $order->getKey(),
        ));

        return $recipients->count();
    }

    /** Notify branch billing users that a served order entered the invoice workflow. */
    public function orderServedForBilling(Order $order, Invoice $invoice): int
    {
        $tenant = $order->tenant;

        if (! $tenant) {
            return 0;
        }

        $recipients = $this->branchRecipients($tenant, $order->branch_id, 'invoices.view');

        Notification::send($recipients, new OrderServedForBillingNotification(
            $invoice->number,
            $order->table?->name,
            (float) $invoice->total,
            $invoice->currency,
            $invoice->getKey(),
        ));

        return $recipients->count();
    }

    /** Notify branch billing users that a verified online payment landed. */
    public function onlinePaymentReceived(Order $order, float $amount): int
    {
        $tenant = $order->tenant;

        if (! $tenant) {
            return 0;
        }

        $recipients = $this->branchRecipients($tenant, $order->branch_id, 'invoices.view');

        Notification::send($recipients, new OnlinePaymentReceivedNotification(
            $order->order_number,
            $order->table?->name,
            $amount,
            $order->currency,
            $order->getKey(),
        ));

        return $recipients->count();
    }

    /** Notify branch staff that a customer requested the bill. */
    public function billRequested(BillRequest $request): int
    {
        $session = $request->session;

        if (! $session || ! $tenant = $session->tenant) {
            return 0;
        }

        $recipients = $this->branchRecipients($tenant, $session->branch_id, 'invoices.view');

        Notification::send($recipients, new BillRequestedNotification(
            $session->table?->name,
            (float) ($request->payable_total ?? 0),
            $session->orders()->value('currency') ?? 'USD',
            $session->getKey(),
        ));

        return $recipients->count();
    }

    public function lowStock(Tenant $tenant): int
    {
        $threshold = (float) ($tenant->getSetting('inventory.low_stock_threshold', 0) ?? 0);

        $balances = StockBalance::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->where('quantity', '<=', $threshold)
            ->with('stockable')
            ->get();

        if ($balances->isEmpty()) {
            return 0;
        }

        $items = $balances->map(fn (StockBalance $b) => [
            'name' => $b->stockable?->name ?? 'Unknown item',
            'quantity' => (float) $b->quantity,
        ])->all();

        $recipients = $this->recipients($tenant);
        Notification::send($recipients, new LowStockNotification($items, $tenant->name));

        return $recipients->count();
    }

    public function subscriptionExpiring(Subscription $subscription): int
    {
        $tenant = $subscription->tenant;

        if (! $tenant) {
            return 0;
        }

        $recipients = $this->recipients($tenant);
        Notification::send($recipients, new SubscriptionExpiringNotification(
            $tenant->name,
            $subscription->plan?->name,
            $subscription->daysRemaining(),
            $subscription->onTrial(),
        ));

        return $recipients->count();
    }

    public function dailySales(Tenant $tenant, Carbon $date): int
    {
        $timezone = $tenant->getSetting('region.timezone') ?? config('app.timezone');
        $start = $date->copy()->setTimezone($timezone)->startOfDay()->utc();
        $end = $date->copy()->setTimezone($timezone)->endOfDay()->utc();

        $orders = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->where('status', 'completed')
            ->whereBetween('placed_at', [$start, $end])
            ->get(['total', 'tax_total']);

        if ($orders->isEmpty()) {
            return 0;
        }

        $net = round((float) $orders->sum('total') - (float) $orders->sum('tax_total'), 2);

        $recipients = $this->recipients($tenant);
        Notification::send($recipients, new SalesSummaryNotification(
            $tenant->name,
            $date->toDateString(),
            $orders->count(),
            $net,
            $tenant->getSetting('region.currency', 'USD'),
        ));

        return $recipients->count();
    }

    public function shiftVariance(Shift $shift): int
    {
        $tenant = $shift->tenant;

        if (! $tenant) {
            return 0;
        }

        $recipients = $this->recipients($tenant);
        Notification::send($recipients, new ShiftVarianceNotification(
            $tenant->name,
            $shift->branch?->name ?? 'Branch',
            (float) $shift->expected_cash,
            (float) $shift->counted_cash,
            (float) $shift->overage_shortage,
            $tenant->getSetting('region.currency', 'USD'),
        ));

        return $recipients->count();
    }
}
