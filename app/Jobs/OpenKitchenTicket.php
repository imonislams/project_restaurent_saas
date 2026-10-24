<?php

namespace App\Jobs;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Opens a kitchen ticket for a committed order. Dispatched after the sale
 * commits, is retry-safe and idempotent (KitchenService never creates a second
 * ticket for the same order), so a retry cannot duplicate the sale.
 */
class OpenKitchenTicket implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [5, 30, 120];

    public function __construct(public int $orderId)
    {
        $this->afterCommit = true;
    }

    public function handle(KitchenService $kitchen, TenantContext $context): void
    {
        $order = Order::withoutGlobalScopes()->with('tenant')->find($this->orderId);

        if (! $order) {
            return;
        }

        if ($order->tenant) {
            $context->set($order->tenant);
        }

        $kitchen->openTicketFor($order);
    }

    /**
     * Record a durable failure marker so a lost ticket can be backfilled later
     * (`kitchen:backfill-tickets`) without losing or duplicating the order.
     */
    public function failed(\Throwable $e): void
    {
        report($e);

        try {
            $tenantId = Order::withoutGlobalScopes()->whereKey($this->orderId)->value('tenant_id');

            app(AuditLogger::class)->log('kitchen.ticket_open_failed', null, [
                'order_id' => $this->orderId,
                'error' => $e->getMessage(),
            ], null, $tenantId);
        } catch (\Throwable $inner) {
            report($inner);
        }
    }
}
