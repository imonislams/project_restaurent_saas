<?php

namespace App\Console\Commands;

use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderRound;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Creates round 1 for orders that predate the round model and links their
 * items and existing kitchen ticket. Idempotent: safe to re-run.
 */
class BackfillOrderRounds extends Command
{
    protected $signature = 'orders:backfill-rounds';

    protected $description = 'Create round 1 for orders that do not have one yet';

    public function handle(): int
    {
        $created = 0;
        $skipped = 0;

        Order::withoutGlobalScopes()
            ->withTrashed()
            ->whereDoesntHave('rounds')
            ->orderBy('id')
            ->chunkById(200, function ($orders) use (&$created, &$skipped): void {
                foreach ($orders as $order) {
                    $round = OrderRound::withoutGlobalScopes()->create([
                        'tenant_id' => $order->tenant_id,
                        'branch_id' => $order->branch_id,
                        'order_id' => $order->getKey(),
                        'round_no' => 1,
                        'source' => $order->source?->value ?? 'pos',
                        'dining_participant_id' => $order->dining_participant_id,
                        'requested_by_user_id' => $order->user_id,
                        'status' => OrderRound::STATUS_ACTIVE,
                        'acceptance_status' => $order->acceptance_status?->value ?? 'auto_accepted',
                        'accepted_at' => $order->accepted_at,
                        'subtotal' => $order->subtotal,
                        'discount_total' => $order->discount_total,
                        'tax_total' => $order->tax_total,
                        'service_charge' => $order->service_charge,
                        'total' => $order->total,
                    ]);

                    DB::table('order_items')
                        ->where('order_id', $order->getKey())
                        ->whereNull('order_round_id')
                        ->update(['order_round_id' => $round->getKey()]);

                    $ticket = KitchenTicket::withoutGlobalScopes()
                        ->where('order_id', $order->getKey())
                        ->orderBy('id')
                        ->first();

                    if ($ticket) {
                        $ticket->forceFill([
                            'order_round_id' => $round->getKey(),
                            'round_no' => 1,
                        ])->save();

                        $round->forceFill([
                            'kitchen_ticket_id' => $ticket->getKey(),
                            'sent_to_kitchen_at' => $ticket->created_at,
                        ])->save();
                    }

                    $created++;
                }
            });

        $this->info("Backfilled {$created} order(s); {$skipped} skipped.");

        return self::SUCCESS;
    }
}
