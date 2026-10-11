<?php

namespace App\Jobs;

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
    public array $backoff = [5, 30];

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
}
