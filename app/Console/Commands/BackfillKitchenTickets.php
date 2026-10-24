<?php

namespace App\Console\Commands;

use App\Domain\Kitchen\KitchenService;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Console\Command;

/**
 * Recovery: open kitchen tickets for confirmed orders that are still missing
 * one (e.g. a queued OpenKitchenTicket job was lost). Safe to run repeatedly —
 * KitchenService::openTicketFor is idempotent per order.
 */
class BackfillKitchenTickets extends Command
{
    protected $signature = 'kitchen:backfill-tickets {--tenant= : Limit to a single tenant id}';

    protected $description = 'Open kitchen tickets for confirmed orders that are missing one';

    public function handle(KitchenService $kitchen, TenantContext $context): int
    {
        $opened = 0;

        Order::withoutGlobalScopes()
            ->with('tenant')
            ->whereNotIn('status', [OrderStatus::Voided->value])
            ->whereIn('acceptance_status', [AcceptanceStatus::AutoAccepted->value, AcceptanceStatus::Accepted->value])
            ->whereDoesntHave('kitchenTicket')
            ->when($this->option('tenant'), fn ($q) => $q->where('tenant_id', (int) $this->option('tenant')))
            ->chunkById(100, function ($orders) use ($kitchen, $context, &$opened) {
                foreach ($orders as $order) {
                    if ($order->tenant) {
                        $context->set($order->tenant);
                    }

                    if ($kitchen->openTicketFor($order)) {
                        $opened++;
                    }
                }
            });

        $this->info("Opened {$opened} kitchen ticket(s).");

        return self::SUCCESS;
    }
}
