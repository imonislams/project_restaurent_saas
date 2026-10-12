<?php

namespace App\Domain\POS;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\CashService;
use App\Domain\CashManagement\Enums\CashMovementType;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\DeliveryService;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\QrDiningSettings;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\StockService;
use App\Domain\Loyalty\LoyaltyService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\ProductVariant;
use App\Domain\Menu\ModifierResolver;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Jobs\OpenKitchenTicket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Completes restaurant orders.
 *
 * Order state, totals, payments, stock movements and cash movements are
 * committed in one transaction; table occupancy is synchronized and the
 * kitchen ticket is opened **after** commit. Totals are always computed on the
 * server and idempotency keys prevent duplicate sales.
 */
class SaleService
{
    public function __construct(
        protected SaleCalculator $calculator,
        protected OrderNumberGenerator $numbers,
        protected StockService $stock,
        protected CashService $cash,
        protected ManagerPinService $pins,
        protected TableService $tables,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    /**
     * Immediate sale: create the order and take payment in one step.
     *
     * @param  array<string, mixed>  $data
     */
    public function place(array $data, User $cashier, Branch $branch): Order
    {
        $tenant = $this->context->tenant() ?? $cashier->tenant;

        if ($existing = $this->findByKey($data['idempotency_key'] ?? null)) {
            return $existing;
        }

        $prepared = $this->prepare($data, $branch, $tenant, true);

        $order = DB::transaction(function () use ($data, $cashier, $branch, $tenant, $prepared) {
            $order = $this->createOrder($data, $cashier, $branch, $tenant, $prepared, OrderStatus::Completed);

            $paidTotal = round(array_sum(array_column($prepared['payments'], 'amount')), 2);
            $change = round(array_sum(array_column($prepared['payments'], 'change')), 2);

            $this->applyPayments($order, $prepared['payments'], $tenant, $prepared['shift'], $data['idempotency_key'] ?? null);

            $this->deductStock($order, $branch);

            $order->forceFill([
                'paid_total' => $paidTotal,
                'change_due' => $change,
                'completed_at' => now(),
            ])->save();

            $this->recordStatus($order, OrderStatus::Completed, $cashier, 'Sale completed');

            $this->audit->log('order.completed', $order, [
                'order_number' => $order->order_number,
                'total' => (float) $order->total,
            ], $cashier, $tenant->getKey());

            return $order;
        });

        return $this->postCommit($order);
    }

    /**
     * Open a held order (e.g. a dine-in table) without taking payment.
     *
     * @param  array<string, mixed>  $data
     */
    public function openOrder(array $data, User $cashier, Branch $branch): Order
    {
        $tenant = $this->context->tenant() ?? $cashier->tenant;
        $prepared = $this->prepare($data, $branch, $tenant, false);

        $order = DB::transaction(function () use ($data, $cashier, $branch, $tenant, $prepared) {
            $order = $this->createOrder($data, $cashier, $branch, $tenant, $prepared, OrderStatus::Held);

            $this->deductStock($order, $branch);

            $this->recordStatus($order, OrderStatus::Held, $cashier, 'Order opened');

            return $order;
        });

        return $this->postCommit($order);
    }

    /**
     * Create a held order from a QR dining session. No staff cashier and no open
     * shift are required; totals come from the same server-side calculator as
     * POS orders, and the kitchen ticket opens only when auto-accept is on.
     *
     * @param  array<string, mixed>  $data
     */
    public function openQrOrder(DiningSession $session, DiningParticipant $participant, array $data, Branch $branch): Order
    {
        $tenant = $this->context->tenant() ?? $branch->tenant;

        if ($existing = $this->findByKey($data['idempotency_key'] ?? null)) {
            return $existing;
        }

        $autoAccept = app(QrDiningSettings::class)->autoAccept();

        $data['order_type'] = $data['order_type'] ?? OrderType::DineIn->value;
        $data['table_id'] = $session->table_id;
        $data['customer_name'] = $data['customer_name'] ?? $participant->display_name;

        $prepared = $this->prepare($data, $branch, $tenant, false, false);

        $order = DB::transaction(function () use ($data, $branch, $tenant, $prepared, $session, $participant, $autoAccept) {
            $order = $this->createOrder($data, null, $branch, $tenant, $prepared, OrderStatus::Held, [
                'source' => OrderSource::Qr->value,
                'dining_session_id' => $session->getKey(),
                'dining_participant_id' => $participant->getKey(),
                'acceptance_status' => ($autoAccept ? AcceptanceStatus::AutoAccepted : AcceptanceStatus::Pending)->value,
                'accepted_at' => $autoAccept ? now() : null,
            ]);

            $this->deductStock($order, $branch);
            $this->recordStatus($order, OrderStatus::Held, null, 'QR order placed');

            return $order;
        });

        return $this->postCommit($order, $autoAccept);
    }

    /**
     * Settle a held order: take payment and complete it.
     *
     * @param  list<array<string, mixed>>  $payments
     */
    public function settle(Order $order, array $payments, User $user, ?string $managerPin = null): Order
    {
        if (! $order->isOpen()) {
            throw ValidationException::withMessages(['order' => 'Only open orders can be settled.']);
        }

        $tenant = $this->context->tenant() ?? $user->tenant;
        $shift = $this->resolveShift([], $order->branch);
        $resolved = $this->resolvePayments($payments, (float) $order->total, $tenant);
        $paidTotal = round(array_sum(array_column($resolved, 'amount')), 2);
        $change = round(array_sum(array_column($resolved, 'change')), 2);

        DB::transaction(function () use ($order, $resolved, $tenant, $shift, $paidTotal, $change, $user) {
            $this->applyPayments($order, $resolved, $tenant, $shift);

            $order->forceFill([
                'shift_id' => $order->shift_id ?? $shift->getKey(),
                'paid_total' => $paidTotal,
                'change_due' => $change,
                'status' => OrderStatus::Completed,
                'completed_at' => now(),
            ])->save();

            $this->recordStatus($order, OrderStatus::Completed, $user, 'Table order settled');

            $this->audit->log('order.settled', $order, [
                'order_number' => $order->order_number,
                'total' => (float) $order->total,
            ], $user, $tenant->getKey());
        });

        $this->tables->refreshForOrder($order);

        try {
            app(LoyaltyService::class)->earnForOrder($order->fresh());
        } catch (\Throwable $e) {
            report($e);
        }

        return $order->fresh(['items', 'payments']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function prepare(array $data, Branch $branch, Tenant $tenant, bool $withPayments, bool $requireShift = true): array
    {
        $shift = $this->resolveShift($data, $branch, $requireShift);
        $type = OrderType::from($data['order_type'] ?? OrderType::Counter->value);
        $lines = $this->resolveLines($data['items'] ?? [], $branch);

        $totals = $this->calculator->calculate($lines, $type, [
            'discount_type' => $data['discount_type'] ?? 'none',
            'discount_value' => (float) ($data['discount_value'] ?? 0),
            'service_charge' => (bool) ($data['service_charge'] ?? false),
        ]);

        $this->authorizeDiscount($tenant, $totals, $data['manager_pin'] ?? null);

        $delivery = app(DeliveryService::class);
        $zone = $type === OrderType::Delivery
            ? $delivery->zone($tenant->getKey(), $data['delivery_zone_id'] ?? null)
            : null;
        $deliveryFee = $delivery->feeFor($zone, (float) $totals['subtotal']);
        $grandTotal = round((float) $totals['total'] + $deliveryFee, 2);

        $payments = $withPayments
            ? $this->resolvePayments($data['payments'] ?? [], $grandTotal, $tenant)
            : [];

        return compact('shift', 'type', 'totals', 'payments', 'zone', 'deliveryFee', 'grandTotal');
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $prepared
     */
    protected function createOrder(array $data, ?User $cashier, Branch $branch, Tenant $tenant, array $prepared, OrderStatus $status, array $extra = []): Order
    {
        $totals = $prepared['totals'];
        $table = $this->resolveTable($data, $branch);
        $customer = ! empty($data['customer_id']) ? Customer::query()->find($data['customer_id']) : null;

        $order = Order::create(array_merge([
            'tenant_id' => $tenant->getKey(),
            'branch_id' => $branch->getKey(),
            'shift_id' => $prepared['shift']?->getKey(),
            'register_id' => $prepared['shift']?->register_id,
            'table_id' => $table?->getKey(),
            'delivery_zone_id' => $prepared['zone']?->getKey(),
            'customer_id' => $customer?->getKey(),
            'user_id' => $cashier?->getKey(),
            'order_number' => $this->numbers->next($branch),
            'order_type' => $prepared['type'],
            'status' => $status,
            'fulfillment_status' => FulfillmentStatus::New,
            'customer_name' => $data['customer_name'] ?? $customer?->name,
            'covers' => $data['covers'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'driver_name' => $data['driver_name'] ?? null,
            'driver_phone' => $data['driver_phone'] ?? null,
            'notes' => $data['notes'] ?? null,
            'subtotal' => $totals['subtotal'],
            'discount_type' => $data['discount_type'] ?? 'none',
            'discount_value' => (float) ($data['discount_value'] ?? 0),
            'discount_total' => $totals['discount_total'],
            'tax_total' => $totals['tax_total'],
            'service_charge' => $totals['service_charge'],
            'delivery_fee' => $prepared['deliveryFee'],
            'total' => $prepared['grandTotal'],
            'currency' => $branch->effectiveCurrency(),
            'idempotency_key' => $data['idempotency_key'] ?? null,
            'placed_at' => now(),
        ], $extra));

        foreach ($totals['items'] as $item) {
            $orderItem = $order->items()->create([
                'tenant_id' => $tenant->getKey(),
                'product_id' => $item['product']->getKey(),
                'product_variant_id' => $item['variant']?->getKey(),
                'name' => $item['name'],
                'sku' => $item['sku'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'unit_cost' => $item['unit_cost'],
                'discount_amount' => $item['discount_amount'],
                'modifiers_total' => $item['modifiers_total'] ?? 0,
                'tax_rate' => $item['tax_rate'],
                'tax_amount' => $item['tax_amount'],
                'line_total' => $item['line_total'],
                'notes' => $item['notes'],
            ]);

            foreach ($item['modifiers'] ?? [] as $modifier) {
                $orderItem->modifiers()->create([
                    'tenant_id' => $tenant->getKey(),
                    'modifier_option_id' => $modifier['option_id'],
                    'group_name' => $modifier['group_name'],
                    'name' => $modifier['name'],
                    'price_delta' => $modifier['price_delta'],
                    'quantity' => $modifier['quantity'],
                ]);
            }
        }

        if ($table) {
            $this->tables->assign($order, $table);
        }

        return $order;
    }

    /**
     * @param  list<array<string, mixed>>  $payments
     */
    protected function applyPayments(Order $order, array $payments, Tenant $tenant, Shift $shift, ?string $idempotencyKey = null): void
    {
        foreach ($payments as $index => $pay) {
            $payment = $order->payments()->create([
                'tenant_id' => $tenant->getKey(),
                'payment_method_id' => $pay['method']->getKey(),
                'amount' => $pay['amount'],
                'tendered' => $pay['tendered'],
                'change_due' => $pay['change'],
                'status' => PaymentStatus::Succeeded,
                'reference' => $pay['reference'],
                'idempotency_key' => $idempotencyKey ? $idempotencyKey.'-'.($index + 1) : null,
                'paid_at' => now(),
            ]);

            $payment->attempts()->create([
                'tenant_id' => $tenant->getKey(),
                'status' => PaymentStatus::Succeeded,
                'reference' => $pay['reference'],
                'payload' => ['method' => $pay['method']->code, 'amount' => $pay['amount']],
            ]);

            if ($pay['method']->isCash()) {
                $this->cash->record($shift, CashMovementType::Sale, $pay['amount'], $order, 'Cash sale');
            }
        }
    }

    protected function recordStatus(Order $order, OrderStatus $status, ?User $user, string $note): void
    {
        $order->statusHistory()->create([
            'tenant_id' => $order->tenant_id,
            'status' => $status,
            'user_id' => $user?->getKey(),
            'note' => $note,
        ]);
    }

    protected function postCommit(Order $order, bool $openKitchen = true): Order
    {
        // Secondary work runs after the core transaction, on the queue. The job
        // is idempotent per order, so a retry never duplicates the sale.
        if ($openKitchen) {
            try {
                OpenKitchenTicket::dispatch($order->getKey());
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $this->tables->refreshForOrder($order);

        // Loyalty points are earned on completed sales only; never fatal.
        try {
            if ($order->isCompleted()) {
                app(LoyaltyService::class)->earnForOrder($order);
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return $order->fresh(['items', 'payments']);
    }

    protected function findByKey(?string $key): ?Order
    {
        if (! $key) {
            return null;
        }

        return Order::query()->where('idempotency_key', $key)->with(['items', 'payments'])->first();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function resolveShift(array $data, Branch $branch, bool $required = true): ?Shift
    {
        $shift = ! empty($data['shift_id'])
            ? Shift::query()->findOrFail($data['shift_id'])
            : Shift::query()->where('branch_id', $branch->getKey())->open()->latest('opened_at')->first();

        if (! $shift) {
            if ($required) {
                throw ValidationException::withMessages([
                    'shift' => 'Open a cashier shift before taking orders.',
                ]);
            }

            return null;
        }

        if (! $shift->isOpen() && $required) {
            throw ValidationException::withMessages([
                'shift' => 'Open a cashier shift before taking orders.',
            ]);
        }

        if ((int) $shift->branch_id !== (int) $branch->getKey()) {
            throw ValidationException::withMessages([
                'shift' => 'The selected shift does not belong to this branch.',
            ]);
        }

        return $shift;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function resolveTable(array $data, Branch $branch): ?Table
    {
        if (empty($data['table_id'])) {
            return null;
        }

        $table = Table::query()->findOrFail($data['table_id']);

        if ((int) $table->branch_id !== (int) $branch->getKey()) {
            throw ValidationException::withMessages([
                'table_id' => 'The selected table does not belong to this branch.',
            ]);
        }

        return $table;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    protected function resolveLines(array $items, Branch $branch): array
    {
        if ($items === []) {
            throw ValidationException::withMessages(['items' => 'An order must contain at least one item.']);
        }

        $lines = [];

        foreach ($items as $row) {
            $product = Product::query()->findOrFail($row['product_id']);

            $variant = ! empty($row['variant_id'])
                ? ProductVariant::query()->where('product_id', $product->getKey())->findOrFail($row['variant_id'])
                : null;

            if (! $product->isAvailableIn($branch->getKey())) {
                throw ValidationException::withMessages([
                    'items' => "\"{$product->name}\" is not available at this branch.",
                ]);
            }

            $lines[] = [
                'product' => $product,
                'variant' => $variant,
                'quantity' => (float) ($row['quantity'] ?? 1),
                'discount_amount' => (float) ($row['discount_amount'] ?? 0),
                'notes' => $row['notes'] ?? null,
                'modifiers' => app(ModifierResolver::class)->resolve($product, $row['modifiers'] ?? []),
            ];
        }

        return $lines;
    }

    /**
     * @param  list<array<string, mixed>>  $payments
     * @return list<array<string, mixed>>
     */
    protected function resolvePayments(array $payments, float $total, Tenant $tenant): array
    {
        if ($payments === []) {
            throw ValidationException::withMessages(['payments' => 'A payment is required to complete the sale.']);
        }

        $resolved = [];
        $hasCash = false;

        foreach ($payments as $row) {
            $method = PaymentMethod::query()->findOrFail($row['payment_method_id']);
            $amount = round((float) ($row['amount'] ?? 0), 2);

            if ($amount <= 0) {
                throw ValidationException::withMessages(['payments' => 'Payment amounts must be greater than zero.']);
            }

            $tendered = isset($row['tendered']) ? round((float) $row['tendered'], 2) : null;
            $change = $tendered !== null && $method->isCash() ? round(max(0.0, $tendered - $amount), 2) : 0.0;

            $hasCash = $hasCash || $method->isCash();

            $resolved[] = [
                'method' => $method,
                'amount' => $amount,
                'tendered' => $tendered,
                'change' => $change,
                'reference' => $row['reference'] ?? null,
            ];
        }

        $paid = round(array_sum(array_column($resolved, 'amount')), 2);
        $allowPartial = (bool) ($tenant->getSetting('pos.allow_partial', false));

        if ($paid < $total - 0.001 && ! $allowPartial) {
            throw ValidationException::withMessages([
                'payments' => 'Payment is less than the order total.',
            ]);
        }

        if ($paid > $total + 0.001 && ! $hasCash) {
            throw ValidationException::withMessages([
                'payments' => 'Payment exceeds the order total.',
            ]);
        }

        return $resolved;
    }

    /**
     * @param  array<string, mixed>  $totals
     */
    protected function authorizeDiscount(Tenant $tenant, array $totals, ?string $pin): void
    {
        $threshold = $tenant->getSetting('pos.discount_approval_percent');

        if ($threshold === null) {
            return;
        }

        $subtotal = (float) $totals['subtotal'];

        if ($subtotal <= 0) {
            return;
        }

        $percent = (float) $totals['discount_total'] / $subtotal * 100;

        if ($percent <= (float) $threshold) {
            return;
        }

        if (! $pin || ! $this->pins->verify($tenant, $pin)) {
            throw ValidationException::withMessages([
                'manager_pin' => 'A manager PIN is required to approve this discount.',
            ]);
        }
    }

    protected function deductStock(Order $order, Branch $branch): void
    {
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);
        $blockOnShortage = (bool) ($this->context->tenant()?->getSetting('inventory.block_sale_when_insufficient', false));

        foreach ($order->items()->get() as $item) {
            $product = $item->product;

            if (! $product) {
                continue;
            }

            if ($product->inventory_mode === InventoryMode::Product) {
                $this->stock->record(
                    $product, $location, -1 * (float) $item->quantity,
                    StockMovementReason::Sale, (float) $item->unit_cost, $order, 'Sale '.$order->order_number, ! $blockOnShortage,
                );

                continue;
            }

            if ($product->inventory_mode === InventoryMode::Recipe) {
                $recipe = $product->recipe()->where('is_active', true)->with('items.ingredient')->first();

                if (! $recipe) {
                    continue;
                }

                $yield = (float) $recipe->yield_quantity ?: 1.0;

                foreach ($recipe->items as $recipeItem) {
                    if (! $recipeItem->ingredient) {
                        continue;
                    }

                    $quantity = round((float) $recipeItem->quantity / $yield * (float) $item->quantity, 3);

                    $this->stock->record(
                        $recipeItem->ingredient, $location, -$quantity,
                        StockMovementReason::Sale, null, $order, 'Sale '.$order->order_number, ! $blockOnShortage,
                    );
                }
            }
        }
    }
}
