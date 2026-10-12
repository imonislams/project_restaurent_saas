<?php

namespace App\Domain\Notifications;

use App\Domain\CashManagement\Models\Shift;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Notifications\Notifications\LowStockNotification;
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
 * Sends operational notifications to the tenant's owners/admins.
 * Delivery is best-effort — a failure here must never affect a committed sale.
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

    /** Active users allowed to approve orders (holders of orders.update). */
    public function approvalRecipients(Tenant $tenant): Collection
    {
        return $tenant->users()
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $user) => $user->hasPermission('orders.update'))
            ->values();
    }

    /** Notify approvers that a QR order is waiting for confirmation. */
    public function newQrOrder(Order $order): int
    {
        $tenant = $order->tenant;

        if (! $tenant) {
            return 0;
        }

        $recipients = $this->approvalRecipients($tenant);

        Notification::send($recipients, new QrOrderPlacedNotification(
            $order->order_number,
            $order->table?->name ?? 'Table',
            (float) $order->total,
            $order->currency,
            $order->getKey(),
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
