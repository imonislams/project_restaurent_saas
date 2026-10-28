<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\CashService;
use App\Domain\CashManagement\Models\Register;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Demo\Data\DemoRandom;
use App\Domain\Demo\DemoClock;
use App\Domain\Demo\DemoRun;
use App\Domain\Dining\DiningSessionService;
use App\Domain\Dining\Models\DiningFeedback;
use App\Domain\Dining\QrDiningOrderService;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\OrderService;
use App\Domain\POS\SaleService;
use App\Domain\Tables\Models\TableQrToken;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;

/**
 * One trading day of history for every branch: a cashier shift, orders placed
 * through the real POS engine (so totals, payments, stock, invoices, loyalty and
 * the kitchen all stay consistent), QR dining sessions, cash movements and the
 * shift close.
 *
 * The step is retry-safe: orders carry deterministic idempotency keys, so
 * re-running a day that failed half-way adopts what already exists instead of
 * selling twice, and the deterministic PRNG reproduces the same day.
 */
class SalesDayStep implements DemoStep
{
    /** Orders left unsettled at the end of the current day so the floor looks live. */
    protected const LIVE_TABLES = 2;

    /** Tickets left in progress on the current day. */
    protected const LIVE_TICKETS = 3;

    public function __construct(protected string $date) {}

    public function key(): string
    {
        return 'day:'.$this->date;
    }

    public function label(): string
    {
        return 'Trading day '.Carbon::parse($this->date)->format('D j M');
    }

    public function run(DemoRun $run): array
    {
        $tenant = $run->tenant();
        $timezone = (string) ($tenant->getSetting('region.timezone') ?? config('app.timezone'));
        $isToday = $this->date === now($timezone)->toDateString();

        $original = $this->muteLiveSideEffects($tenant);

        try {
            $counters = ['orders' => 0, 'revenue' => 0.0, 'tickets' => 0, 'sessions' => 0, 'voids' => 0];

            foreach (['primary', 'annex'] as $branchKey) {
                foreach ($this->branchDay($run, $branchKey, $isToday, $timezone) as $key => $value) {
                    $counters[$key] += $value;
                }
            }

            return $counters;
        } finally {
            $this->restoreSettings($tenant, $original);
        }
    }

    /**
     * @return array<string, int|float>
     */
    protected function branchDay(DemoRun $run, string $branchKey, bool $isToday, string $timezone): array
    {
        $branch = $run->branch($branchKey);
        $random = $run->random('day-'.$branchKey);
        $cashier = $run->user($branchKey === 'primary' ? 'cashier1' : 'cashier3');
        $manager = $run->user('manager');

        $dayStart = Carbon::parse($this->date, $timezone)->startOfDay();
        $registers = (array) $run->ref("registers.$branchKey", []);
        $shift = $this->shiftFor($run, $branch, $cashier, $registers[0] ?? null, $dayStart, $timezone);

        $counters = ['orders' => 0, 'revenue' => 0.0, 'tickets' => 0, 'sessions' => 0, 'voids' => 0];
        $orders = [];

        foreach ($this->slots($run, $branchKey, $isToday, $random, $dayStart, $timezone) as $index => $at) {
            $order = $this->placeOrder($run, $branch, $branchKey, $at, $index, $random, $cashier);

            if ($order === null) {
                continue;
            }

            $orders[] = $order;
            $counters['orders']++;
            $counters['revenue'] += (float) $order->total;
        }

        // Tables still occupied: held orders that nobody has settled yet.
        if ($isToday) {
            foreach ($this->heldOrders($run, $branch, $branchKey, $random, $cashier, $orders) as $order) {
                $orders[] = $order;
                $counters['orders']++;
                $counters['revenue'] += (float) $order->total;
            }
        }

        $counters['tickets'] += $this->kitchenLifecycle($run, $orders, $isToday, $random);

        $counters['sessions'] += $this->diningSessions($run, $branchKey, $random, $dayStart, $isToday, $timezone, $cashier, $manager);

        if (! $isToday && $orders !== [] && $this->isVoidDay($branchKey)) {
            $counters['voids'] += $this->voidOne($run, $manager, $orders, $random);
        }

        $this->cashMovements($run, $shift, $dayStart, $random, $isToday);

        if (! $isToday) {
            $this->closeShift($shift, $manager, $dayStart->copy()->setTime(23, 15));
        }

        return $counters;
    }

    /**
     * Deterministic order times. The current day only holds the hours that have
     * already elapsed, so nothing is ever dated in the future.
     *
     * @return list<Carbon>
     */
    protected function slots(DemoRun $run, string $branchKey, bool $isToday, DemoRandom $random, Carbon $dayStart, string $timezone): array
    {
        if ($isToday) {
            $now = now($timezone);
            $openAt = $this->openingTime($run, $branchKey, $dayStart);
            $windowStart = $now->copy()->subHours(4);

            if ($openAt->greaterThan($windowStart)) {
                $windowStart = $openAt->copy();
            }

            if ($windowStart->greaterThanOrEqualTo($now)) {
                return [];
            }

            $span = max(1, $windowStart->diffInSeconds($now->copy()->subMinutes(5)));
            $slots = [];

            foreach (range(1, $random->int(8, 13)) as $ignored) {
                $slots[] = $windowStart->copy()->addSeconds($random->int(0, (int) $span));
            }

            sort($slots);

            return $slots;
        }

        $base = $branchKey === 'primary' ? 24 : 14;
        $weekendLift = in_array($dayStart->dayOfWeek, [5, 6], true) ? 1.35 : 1.0;
        $count = max(6, (int) round($base * $weekendLift * $random->float(0.85, 1.15, 3)));

        $parts = [
            ['start' => 11.75, 'end' => 15.5, 'weight' => 34],
            ['start' => 15.5, 'end' => 18.5, 'weight' => 18],
            ['start' => 18.5, 'end' => 22.75, 'weight' => 48],
        ];

        $slots = [];

        for ($i = 0; $i < $count; $i++) {
            $part = $random->weighted(array_map(
                fn (array $window) => ['value' => $window, 'weight' => $window['weight']],
                $parts,
            ));

            $slots[] = $dayStart->copy()->addMinutes($random->int(
                (int) round($part['start'] * 60),
                (int) round($part['end'] * 60),
            ));
        }

        sort($slots);

        return $slots;
    }

    protected function placeOrder(DemoRun $run, Branch $branch, string $branchKey, Carbon $at, int $index, DemoRandom $random, User $cashier): ?Order
    {
        $key = sprintf('demo-%d-%d-%s-%d', $run->batch->getKey(), $branch->getKey(), $this->date, $index);

        if ($existing = Order::query()->withoutGlobalScopes()->where('idempotency_key', $key)->first()) {
            return $existing;
        }

        $payload = $this->orderPayload($run, $branchKey, $key, $random, $index, $branch);

        if ($payload === null) {
            return null;
        }

        return DemoClock::at($at, function () use ($payload, $cashier, $branch, $run, $random) {
            $order = app(SaleService::class)->openOrder($payload, $cashier, $branch);

            $total = (float) $order->total;

            if ($total <= 0) {
                return $order;
            }

            app(SaleService::class)->settle($order, $this->payments($run, $random, $total), $cashier);

            return $order->fresh();
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function orderPayload(DemoRun $run, string $branchKey, string $key, DemoRandom $random, int $index, Branch $branch): ?array
    {
        $products = (array) $run->ref('products', []);

        if ($products === []) {
            return null;
        }

        $items = $this->items($run, $random, $products, $branchKey);

        if ($items === []) {
            return null;
        }

        $type = $this->orderType($random);
        $tables = (array) $run->ref("tables.$branchKey", []);
        $names = $run->profile()->names();
        $customer = $this->customer($run, $random, $branch);

        // A zone only accepts orders above its minimum, and the cart is priced
        // server-side — so the estimate here is a deliberate lower bound (base
        // prices, before modifier and discount effects) that the real subtotal
        // can only exceed.
        $delivery = null;

        if ($type === OrderType::Delivery) {
            $estimate = $this->estimate($items, $products);
            $candidates = array_values(array_filter(
                (array) $run->ref('zones', []),
                fn (array $zone) => (float) $zone['min_order'] <= $estimate,
            ));

            if ($candidates === []) {
                $type = OrderType::Takeaway;
            } else {
                $delivery = $random->pick($candidates);
            }
        }

        $payload = [
            'order_type' => $type->value,
            'idempotency_key' => $key,
            'items' => $items,
            'covers' => $type === OrderType::DineIn ? $random->int(2, 6) : null,
            'customer_id' => $customer['id'] ?? null,
            'customer_name' => $customer['name'] ?? ($random->bool(0.35) ? $names->person($random) : null),
            'table_id' => $type === OrderType::DineIn && $tables !== [] ? $random->pick($tables)['id'] : null,
        ];

        if ($delivery !== null) {
            $payload['delivery_zone_id'] = $delivery['id'];
            $payload['delivery_address'] = $names->address($random);
            $payload['driver_name'] = $names->person($random);
            $payload['driver_phone'] = $names->phone($random);
        }

        if ($random->bool(0.08)) {
            $payload['notes'] = $names->deliveryNote($random);
        }

        // Occasional promotional discount (no approval threshold is set on a
        // fresh tenant, so this never demands a manager PIN).
        if ($random->bool(0.07)) {
            $payload['discount_type'] = 'percent';
            $payload['discount_value'] = $random->pick([5, 10]);
        }

        return $payload;
    }

    /**
     * @param  list<array<string, mixed>>  $products
     * @return list<array<string, mixed>>
     */
    protected function items(DemoRun $run, DemoRandom $random, array $products, ?string $branchKey = null): array
    {
        $byKind = [];

        foreach ($products as $product) {
            // Respect per-branch availability: the POS refuses an item that is
            // switched off for the branch, so the demo must not order it either.
            if ($branchKey !== null && in_array($branchKey, $product['unavailable'] ?? [], true)) {
                continue;
            }

            $byKind[$product['kind']][] = $product;
        }

        $mains = array_merge($byKind['main'] ?? [], $byKind['rice'] ?? [], $byKind['quick'] ?? []);

        if ($mains === []) {
            return [];
        }

        $modifiers = (array) $run->ref('modifiers', []);
        $mains = $random->shuffle($mains);
        $lines = [];

        $mainCount = (int) $random->weighted([
            ['value' => 1, 'weight' => 45],
            ['value' => 2, 'weight' => 45],
            ['value' => 3, 'weight' => 10],
        ]);

        for ($i = 0; $i < min($mainCount, count($mains)); $i++) {
            $lines[] = $this->line($random, $mains[$i], $modifiers);
        }

        foreach ([['bread', 45], ['side', 35], ['drink', 55], ['dessert', 22], ['starter', 18]] as [$kind, $chance]) {
            if (! empty($byKind[$kind]) && $random->bool($chance / 100)) {
                $lines[] = $this->line($random, $random->pick($byKind[$kind]), $modifiers);
            }
        }

        return $lines;
    }

    /**
     * Lower bound of a cart's subtotal, from the item's own price (variant price
     * when one is chosen). Modifiers and their extras only ever add to this.
     *
     * @param  list<array<string, mixed>>  $items
     * @param  list<array<string, mixed>>  $products
     */
    protected function estimate(array $items, array $products): float
    {
        $byId = [];

        foreach ($products as $product) {
            $byId[$product['id']] = $product;
        }

        $total = 0.0;

        foreach ($items as $line) {
            $product = $byId[$line['product_id']] ?? null;

            if ($product === null) {
                continue;
            }

            $unit = (float) ($product['price'] ?? 0);

            foreach ($product['variants'] ?? [] as $variant) {
                if (($line['variant_id'] ?? null) === $variant['id']) {
                    $unit = (float) $variant['price'];
                }
            }

            $total += $unit * (float) ($line['quantity'] ?? 1);
        }

        return round($total, 2);
    }

    /**
     * @param  array<string, mixed>  $modifiers
     * @return array<string, mixed>
     */
    protected function line(DemoRandom $random, array $product, array $modifiers): array
    {
        $line = [
            'product_id' => $product['id'],
            'quantity' => $random->bool(0.15) ? 2 : 1,
        ];

        $variants = $product['variants'] ?? [];

        if ($variants !== []) {
            $line['variant_id'] = $random->bool(0.7) ? $variants[0]['id'] : $random->pick($variants)['id'];
        }

        $selections = [];

        foreach (($product['groups'] ?? []) as $groupKey) {
            $group = $modifiers[$groupKey] ?? null;

            if (! $group || empty($group['options'])) {
                continue;
            }

            if ($group['type'] === 'single') {
                $chance = match ($groupKey) {
                    'spice' => 0.5,
                    'drinks' => 0.15,
                    'sides' => 0.2,
                    default => 0.2,
                };

                if ($random->bool($chance)) {
                    $selections[] = ['option_id' => $random->bool(0.5) && $group['default']
                        ? $group['default']
                        : $random->pick($group['options'])];
                }

                continue;
            }

            if (! $random->bool(0.35)) {
                continue;
            }

            $options = $random->shuffle($group['options']);

            foreach (range(1, min($random->int(1, 2), count($options))) as $offset) {
                $selections[] = ['option_id' => $options[$offset - 1]];
            }
        }

        if ($selections !== []) {
            $line['modifiers'] = $selections;
        }

        return $line;
    }

    /**
     * Held orders that keep the floor and the POS "open orders" view alive.
     *
     * @param  list<Order>  $placed
     * @return list<Order>
     */
    protected function heldOrders(DemoRun $run, Branch $branch, string $branchKey, DemoRandom $random, User $cashier, array $placed): array
    {
        $tables = (array) $run->ref("tables.$branchKey", []);
        $products = (array) $run->ref('products', []);

        if ($tables === [] || $products === []) {
            return [];
        }

        $held = [];
        $candidates = $random->shuffle($tables);

        foreach (range(1, min(self::LIVE_TABLES, count($candidates))) as $offset) {
            $table = $candidates[$offset - 1];
            $key = sprintf('demo-%d-%d-%s-held-%d', $run->batch->getKey(), $branch->getKey(), $this->date, $table['id']);

            $existing = Order::query()->withoutGlobalScopes()->where('idempotency_key', $key)->first();

            if ($existing) {
                $held[] = $existing;

                continue;
            }

            $items = $this->items($run, $random, $products, $branchKey);

            if ($items === []) {
                continue;
            }

            $at = now()->subMinutes($random->int(10, 70));

            $order = DemoClock::at($at, fn () => app(SaleService::class)->openOrder([
                'order_type' => OrderType::DineIn->value,
                'idempotency_key' => $key,
                'items' => $items,
                'table_id' => $table['id'],
                'covers' => $random->int(2, 5),
                'customer_name' => $random->bool(0.5) ? $run->profile()->names()->person($random) : null,
            ], $cashier, $branch));

            $held[] = $order;
        }

        return $held;
    }

    /**
     * Kitchen history: most tickets run to served, the newest few stay live so
     * the KDS board is not empty.
     *
     * @param  list<Order>  $orders
     */
    protected function kitchenLifecycle(DemoRun $run, array $orders, bool $isToday, DemoRandom $random): int
    {
        $kitchen = app(KitchenService::class);
        $live = $isToday ? array_slice($orders, -self::LIVE_TICKETS) : [];
        $liveIds = array_map(fn (Order $order) => $order->getKey(), $live);
        $count = 0;

        foreach ($orders as $order) {
            $fresh = Order::query()->withoutGlobalScopes()->find($order->getKey());

            if (! $fresh || ! $fresh->placed_at) {
                continue;
            }

            $placedAt = $fresh->placed_at->copy();
            $ticket = DemoClock::at($placedAt->copy()->addMinutes(1), fn () => $kitchen->openTicketFor($fresh));

            if (! $ticket) {
                continue;
            }

            $count++;

            if ($ticket->status->isTerminal()) {
                continue;
            }

            if (in_array($fresh->getKey(), $liveIds, true)) {
                $stages = [null, KitchenTicketStatus::Accepted, KitchenTicketStatus::Preparing];
                $target = $random->pick($stages);

                if ($target !== null) {
                    DemoClock::at($placedAt->copy()->addMinutes(3), fn () => $kitchen->setTicketStatus($ticket->fresh(), $target));
                }

                continue;
            }

            $stages = [
                [3, KitchenTicketStatus::Accepted],
                [8, KitchenTicketStatus::Preparing],
                [17, KitchenTicketStatus::Ready],
                [21, KitchenTicketStatus::Served],
            ];

            foreach ($stages as [$minutes, $status]) {
                DemoClock::at($placedAt->copy()->addMinutes($minutes), function () use ($kitchen, $ticket, $status) {
                    $current = $ticket->fresh();

                    if ($current && ! $current->status->isTerminal()) {
                        $kitchen->setTicketStatus($current, $status);
                    }
                });
            }
        }

        return $count;
    }

    /**
     * QR dining: historical sessions are accepted, settled and closed; today's
     * stay open with orders awaiting staff approval.
     */
    protected function diningSessions(
        DemoRun $run,
        string $branchKey,
        DemoRandom $random,
        Carbon $dayStart,
        bool $isToday,
        string $timezone,
        User $cashier,
        User $manager,
    ): int {
        $tables = (array) $run->ref("tables.$branchKey", []);

        if ($tables === []) {
            return 0;
        }

        $sessions = $isToday ? ($branchKey === 'primary' ? 3 : 1) : ($random->bool(0.6) ? 1 : 0);

        if ($sessions === 0) {
            return 0;
        }

        $created = 0;

        foreach (array_slice($random->shuffle($tables), 0, $sessions) as $index => $table) {
            $token = TableQrToken::query()->withoutGlobalScopes()
                ->where('table_id', $table['id'])
                ->where('is_active', true)
                ->first();

            if (! $token) {
                continue;
            }

            // Today's guests are still at the table: the session, its order and
            // any bill request are all a few minutes old — recent enough to be
            // the live approval queue, and never dated in the future.
            $at = $isToday
                ? now($timezone)->subMinutes($random->int(18, 25))
                : $dayStart->copy()->setTime(19, $random->int(0, 55));

            $created += $this->oneDiningSession($run, $token, $at, $isToday, $random, $cashier, $manager, $index, $branchKey);
        }

        return $created;
    }

    protected function oneDiningSession(
        DemoRun $run,
        TableQrToken $token,
        Carbon $at,
        bool $isToday,
        DemoRandom $random,
        User $cashier,
        User $manager,
        int $index,
        string $branchKey,
    ): int {
        $names = $run->profile()->names();
        $guest = $names->person($random);

        $join = DemoClock::at($at, fn () => app(DiningSessionService::class)->startOrJoin($token, [
            'name' => $guest,
            'phone' => $names->phone($random),
            'marketing_consent' => $random->bool(0.4),
        ]));

        $session = $join['session'];
        $participant = $join['participant'];

        $items = $this->items($run, $random, (array) $run->ref('products', []), $branchKey);

        if ($items === []) {
            return 0;
        }

        $order = DemoClock::at($at->copy()->addMinutes(3), fn () => app(QrDiningOrderService::class)->place(
            $session,
            $participant,
            [
                'items' => $items,
                'customer_name' => $guest,
                'idempotency_key' => sprintf('demo-qr-%d-%d-%d', $run->batch->getKey(), $session->getKey(), $index + 1),
            ],
        ));

        if ($isToday) {
            // Left awaiting approval on purpose: this is what fills the approval
            // queue, the staff notification bell and the live QR tracking page.
            if ($random->bool(0.5)) {
                // Clamped to the past: a bill request cannot be dated ahead of
                // now, however recent the session is.
                $billAt = $at->copy()->addMinutes(20);
                $billAt = $billAt->greaterThan(now()) ? now()->subMinute() : $billAt;

                DemoClock::at($billAt, fn () => app(DiningSessionService::class)
                    ->requestBill($session->fresh(), $participant));
            }

            return 1;
        }

        $fresh = $order->fresh();

        if ($fresh->acceptance_status === AcceptanceStatus::Pending) {
            DemoClock::at($at->copy()->addMinutes(7), fn () => app(OrderService::class)->accept($fresh, $manager));
        }

        $total = (float) $fresh->total;

        if ($total > 0) {
            DemoClock::at($at->copy()->addMinutes(35), fn () => app(SaleService::class)
                ->settle($fresh->fresh(), $this->payments($run, $random, $total), $cashier));
        }

        DemoClock::at($at->copy()->addMinutes(70), function () use ($session, $random, $run) {
            DiningFeedback::query()->create([
                'tenant_id' => $session->tenant_id,
                'dining_session_id' => $session->getKey(),
                'customer_id' => null,
                'rating' => $random->int(3, 5),
                'comment' => $random->pick($run->profile()->feedbackComments()),
                'consent_marketing' => $random->bool(0.3),
                'created_at' => now(),
            ]);

            app(DiningSessionService::class)->close($session->fresh(), 'settled');
        });

        return 1;
    }

    /**
     * Deterministic void days, so every demo run has a few voided orders for the
     * reports instead of leaving it to chance.
     */
    protected function isVoidDay(string $branchKey): bool
    {
        return $branchKey === 'primary' && Carbon::parse($this->date)->day % 4 === 0;
    }

    protected function voidOne(DemoRun $run, User $manager, array $orders, DemoRandom $random): int
    {
        $candidate = $random->pick($orders);
        $order = Order::query()->withoutGlobalScopes()->find($candidate->getKey());

        if (! $order || ! $order->canBeVoided() || $order->status === OrderStatus::Voided) {
            return 0;
        }

        try {
            DemoClock::at($order->placed_at->copy()->addMinutes(30), fn () => app(OrderService::class)
                ->void($order, $manager, $run->profile()->managerPin()));

            return 1;
        } catch (\Throwable $e) {
            report($e);

            return 0;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function payments(DemoRun $run, DemoRandom $random, float $total): array
    {
        $total = max(0.01, round($total, 2));

        $mode = $random->weighted([
            ['value' => 'cash', 'weight' => 55],
            ['value' => 'card', 'weight' => 25],
            ['value' => 'mobile', 'weight' => 15],
            ['value' => 'split', 'weight' => 5],
        ]);

        if ($mode === 'split') {
            $cashAmount = round($total * 0.5, 2);
            $cardAmount = round($total - $cashAmount, 2);

            return [
                ['payment_method_id' => $run->paymentMethod('cash')->getKey(), 'amount' => $cashAmount, 'tendered' => $this->tender($cashAmount, $random)],
                ['payment_method_id' => $run->paymentMethod('card')->getKey(), 'amount' => $cardAmount],
            ];
        }

        $method = $run->paymentMethod($mode);
        $payment = ['payment_method_id' => $method->getKey(), 'amount' => $total];

        if ($method->isCash()) {
            $payment['tendered'] = $this->tender($total, $random);
        }

        return [$payment];
    }

    /** Cash rounded up to a plausible note/coin the guest would hand over. */
    protected function tender(float $amount, DemoRandom $random): float
    {
        $step = $amount > 500 ? 100 : ($amount > 100 ? 50 : ($amount > 20 ? 10 : 5));
        $rounded = ceil($amount / $step) * $step;

        return round($random->bool(0.35) && $amount > 20 ? $rounded + $step : $rounded, 2);
    }

    protected function orderType(DemoRandom $random): OrderType
    {
        return $random->weighted([
            ['value' => OrderType::DineIn, 'weight' => 50],
            ['value' => OrderType::Takeaway, 'weight' => 25],
            ['value' => OrderType::Delivery, 'weight' => 15],
            ['value' => OrderType::Counter, 'weight' => 10],
        ]);
    }

    /**
     * @return array{id?: int, name?: string}
     */
    protected function customer(DemoRun $run, DemoRandom $random, Branch $branch): array
    {
        if (! $random->bool(0.55)) {
            return [];
        }

        $customers = (array) $run->ref('customers', []);

        if ($customers === []) {
            return [];
        }

        $weighted = [];

        foreach ($customers as $customer) {
            $weighted[] = ['value' => $customer, 'weight' => (int) ($customer['weight'] ?? 1)];
        }

        return (array) $random->weighted($weighted);
    }

    protected function shiftFor(DemoRun $run, Branch $branch, User $cashier, ?int $registerId, Carbon $dayStart, string $timezone): Shift
    {
        $existing = Shift::query()->withoutGlobalScopes()
            ->where('branch_id', $branch->getKey())
            ->when($registerId, fn ($query) => $query->where('register_id', $registerId))
            ->whereBetween('opened_at', [$dayStart->copy()->utc(), $dayStart->copy()->endOfDay()->utc()])
            ->latest('id')
            ->first();

        if ($existing) {
            // A retry after a partial close: reopen so the rest of the day can
            // still settle instead of opening a second shift for the same till.
            if (! $existing->isOpen()) {
                $existing->forceFill(['status' => 'open', 'closed_at' => null, 'closed_by' => null])->save();
            }

            return $existing;
        }

        $float = $run->profile()->openingFloat() * ($branch->is_primary ? 1.0 : 0.5);

        // A till that is open right now belongs to live trade, so the demo takes
        // a free one (or its own) instead of refusing to back-date a shift.
        $registerId = $this->freeRegister($run, $branch, $branch->is_primary ? 'primary' : 'annex', $registerId);

        return DemoClock::at(
            $this->openingTime($run, $branch->is_primary ? 'primary' : 'annex', $dayStart),
            fn () => app(ShiftService::class)->open($branch, $cashier, $float, $registerId),
        );
    }

    /**
     * The register to open this day's shift on: the preferred one when it is free,
     * otherwise any free one, otherwise a dedicated demo till. Never one that is
     * open right now — that belongs to someone using the system.
     */
    protected function freeRegister(DemoRun $run, Branch $branch, string $branchKey, ?int $preferred): ?int
    {
        $candidates = array_values(array_unique(array_filter(array_merge(
            $preferred !== null ? [$preferred] : [],
            (array) $run->ref("registers.$branchKey", []),
        ))));

        foreach ($candidates as $candidate) {
            $busy = Shift::query()->withoutGlobalScopes()
                ->where('register_id', $candidate)
                ->where('status', 'open')
                ->exists();

            if (! $busy) {
                return (int) $candidate;
            }
        }

        $register = Register::query()->withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $run->batch->tenant_id, 'branch_id' => $branch->getKey(), 'name' => 'Demo Till'],
            ['is_active' => true],
        );

        return $register->getKey();
    }

    protected function closeShift(Shift $shift, User $manager, Carbon $at): void
    {
        if (! $shift->isOpen()) {
            return;
        }

        $expected = $shift->currentExpectedCash();

        DemoClock::at($at, fn () => app(ShiftService::class)->close($shift, $manager, $expected, null, 'End of trading day'));
    }

    /**
     * A mid-service float top-up and an evening bank drop. On the current day
     * both are dated inside the elapsed window — never in the future.
     */
    protected function cashMovements(DemoRun $run, Shift $shift, Carbon $dayStart, DemoRandom $random, bool $isToday): void
    {
        if (! $shift->isOpen()) {
            return;
        }

        $cash = app(CashService::class);
        $topUp = round($run->profile()->openingFloat() * 0.25, 2);
        $openedAt = $shift->opened_at?->copy() ?? $dayStart->copy();
        $limit = $isToday ? now() : $dayStart->copy()->endOfDay();

        $inAt = $isToday
            ? $limit->copy()->subHours(3)
            : $dayStart->copy()->setTime(14, $random->int(0, 30));

        if ($inAt->greaterThan($openedAt) && $inAt->lessThanOrEqualTo($limit)) {
            DemoClock::at($inAt, function () use ($cash, $shift, $topUp) {
                if ($shift->fresh()?->isOpen()) {
                    $cash->cashIn($shift, $topUp, 'Change float top-up');
                }
            });
        }

        $outAt = $isToday
            ? $limit->copy()->subMinutes(30)
            : $dayStart->copy()->setTime(21, $random->int(30, 59));

        if (! $outAt->greaterThan($openedAt) || $outAt->greaterThan($limit)) {
            return;
        }

        DemoClock::at($outAt, function () use ($cash, $shift) {
            $fresh = $shift->fresh();

            if (! $fresh?->isOpen()) {
                return;
            }

            // Never drop the drawer below a working float.
            $drop = round(max(0.0, $fresh->currentExpectedCash() * 0.6), 2);

            if ($drop > 0) {
                $cash->cashOut($fresh, $drop, 'Bank drop');
            }
        });
    }

    protected function openingTime(DemoRun $run, string $branchKey, Carbon $dayStart): Carbon
    {
        $branch = $run->branch($branchKey);
        $hours = $branch->businessHours()->where('day_of_week', $dayStart->dayOfWeek)->first();
        $opensAt = $hours && ! $hours->is_closed && $hours->opens_at ? substr((string) $hours->opens_at, 0, 5) : '09:30';

        [$hour, $minute] = array_pad(explode(':', $opensAt), 2, '0');

        return $dayStart->copy()->setTime((int) $hour, (int) $minute);
    }

    /**
     * While the demo is generating, orders must not fan out into queued jobs
     * (the kitchen tickets are created synchronously with realistic timing) and
     * staff orders must not park in "awaiting approval" forever. The tenant's own
     * settings are restored as soon as the step ends.
     *
     * @return array<string, mixed>
     */
    protected function muteLiveSideEffects(Tenant $tenant): array
    {
        $original = [
            'orders.send_confirmed_to_kitchen' => (bool) $tenant->getSetting('orders.send_confirmed_to_kitchen', true),
            'orders.staff_confirmation_mode' => (string) $tenant->getSetting('orders.staff_confirmation_mode', 'central'),
            'orders.branch_direct_order_taking' => (bool) $tenant->getSetting('orders.branch_direct_order_taking', false),
        ];

        $tenant->mergeSettings([
            'orders.send_confirmed_to_kitchen' => false,
            'orders.staff_confirmation_mode' => 'direct',
            'orders.branch_direct_order_taking' => true,
        ]);

        $tenant->save();

        return $original;
    }

    /**
     * @param  array<string, mixed>  $original
     */
    protected function restoreSettings(Tenant $tenant, array $original): void
    {
        $tenant->mergeSettings($original);
        $tenant->save();
    }
}
