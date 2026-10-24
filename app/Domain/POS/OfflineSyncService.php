<?php

namespace App\Domain\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\POS\Models\OfflineSyncConflict;
use App\Http\Requests\POS\PlaceOrderRequest;
use App\Http\Requests\POS\SyncOfflineOperationsRequest;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Replays operations that were captured while a device was offline.
 *
 * Every operation is applied through the same services as a live one, so shift,
 * stock, pricing, cash and audit rules are unchanged. Re-sending a batch is safe:
 * the order idempotency key short-circuits an operation already applied, so a
 * retry can never double-post a sale.
 *
 * Anything the server decides differently from the device is recorded as an
 * {@see OfflineSyncConflict} rather than being silently accepted or dropped.
 */
class OfflineSyncService
{
    /**
     * The permission a live request needs for the same operation. Enforced per
     * operation because one endpoint serves sales, held orders and settlements.
     */
    protected const REQUIRED_PERMISSION = [
        'place_sale' => 'orders.update',
        'open_order' => 'orders.create',
        'settle_order' => 'orders.update',
    ];

    /** Totals within this tolerance are the same total. */
    protected const TOTAL_TOLERANCE = 0.01;

    public function __construct(
        protected SaleService $sales,
        protected OfflineConflictRecorder $conflicts,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $operations
     * @return list<array<string, mixed>>
     */
    public function apply(array $operations, User $user): array
    {
        return array_map(fn (array $operation) => $this->applyOne($operation, $user), $operations);
    }

    /**
     * @param  array<string, mixed>  $operation
     * @return array<string, mixed>
     */
    protected function applyOne(array $operation, User $user): array
    {
        $uuid = (string) ($operation['uuid'] ?? '');
        $type = (string) ($operation['type'] ?? '');
        $payload = (array) ($operation['payload'] ?? []);

        if (! in_array($type, SyncOfflineOperationsRequest::TYPES, true)) {
            return $this->rejected($uuid, 'Unsupported offline operation.');
        }

        if (! $user->hasPermission(self::REQUIRED_PERMISSION[$type])) {
            return $this->rejected($uuid, 'You are not allowed to apply this operation.');
        }

        try {
            [$order, $differences] = match ($type) {
                'place_sale' => $this->placeSale($payload, $operation, $user),
                'open_order' => $this->openOrder($payload, $operation, $user),
                'settle_order' => $this->settleOrder($payload, $user),
            };
        } catch (ValidationException $e) {
            $message = $this->firstMessage($e);

            $this->conflicts->record($operation, $this->classify($e), $message, [], $user);

            return $this->rejected($uuid, $message);
        } catch (\Throwable $e) {
            report($e);

            $this->conflicts->record(
                $operation,
                OfflineSyncConflict::TYPE_REJECTED,
                $e->getMessage(),
                [],
                $user,
            );

            return $this->rejected($uuid, 'The server could not apply this operation.');
        }

        $this->markOfflineOrigin($order, $operation);

        // Recorded after the fact so the conflict points at the order it concerns.
        foreach ($differences as $difference) {
            $this->conflicts->record($operation, $difference['type'], $difference['message'], [
                'order_id' => $order->getKey(),
                'expected' => $difference['expected'] ?? null,
                'actual' => $difference['actual'] ?? null,
            ], $user);
        }

        return [
            'uuid' => $uuid,
            'status' => $differences === [] ? 'accepted' : 'conflicted',
            'order_id' => $order->getKey(),
            'order_number' => $order->order_number,
            'messages' => array_map(fn (array $difference) => $difference['message'], $differences),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $operation
     * @return array{0: Order, 1: list<array<string, mixed>>}
     */
    protected function placeSale(array $payload, array $operation, User $user): array
    {
        $data = $this->validated($payload, [
            ...PlaceOrderRequest::orderRules($user),
            'payments' => ['nullable', 'array'],
            ...PlaceOrderRequest::paymentRules($user->tenant_id),
        ]);

        $differences = [];
        $data = $this->detachOccupiedTable($data, $differences);

        $order = $this->sales->place($data, $user, $this->branch($user, $data));

        $difference = $this->totalDifference($operation, (float) $order->total);

        if ($difference !== null) {
            $differences[] = $difference;
        }

        return [$order, $differences];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $operation
     * @return array{0: Order, 1: list<array<string, mixed>>}
     */
    protected function openOrder(array $payload, array $operation, User $user): array
    {
        $data = $this->validated($payload, PlaceOrderRequest::orderRules($user));

        $differences = [];
        $data = $this->detachOccupiedTable($data, $differences);

        $order = $this->sales->openOrder($data, $user, $this->branch($user, $data));

        return [$order, $differences];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: Order, 1: list<array<string, mixed>>}
     */
    protected function settleOrder(array $payload, User $user): array
    {
        $data = $this->validated($payload, [
            'order_id' => ['required', 'integer', Rule::exists('orders', 'id')->where('tenant_id', $user->tenant_id)],
            'payments' => ['required', 'array', 'min:1'],
            ...PlaceOrderRequest::paymentRules($user->tenant_id),
        ]);

        $order = Order::query()->findOrFail($data['order_id']);

        return [$this->sales->settle($order, $data['payments'], $user), []];
    }

    /**
     * A table that was free when the device went offline may be taken by the time
     * the order syncs. The sale must not be lost over it: the order is recorded
     * without the table and the difference is flagged.
     *
     * @param  array<string, mixed>  $data
     * @param  list<array<string, mixed>>  $differences
     * @return array<string, mixed>
     */
    protected function detachOccupiedTable(array $data, array &$differences): array
    {
        if (empty($data['table_id'])) {
            return $data;
        }

        $occupied = Order::query()
            ->where('table_id', $data['table_id'])
            ->whereIn('status', [OrderStatus::Held->value, OrderStatus::Draft->value])
            ->exists();

        if (! $occupied) {
            return $data;
        }

        $differences[] = [
            'type' => OfflineSyncConflict::TYPE_TABLE_OCCUPIED,
            'message' => 'That table was already occupied when the order synced; the sale was recorded without it.',
            'expected' => ['table_id' => $data['table_id']],
            'actual' => ['table_id' => null],
        ];

        unset($data['table_id'], $data['covers']);

        return $data;
    }

    /**
     * The device's provisional total against the server's authoritative one.
     *
     * @param  array<string, mixed>  $operation
     * @return array<string, mixed>|null
     */
    protected function totalDifference(array $operation, float $serverTotal): ?array
    {
        $expected = $operation['expected_total'] ?? null;

        if ($expected === null) {
            return null;
        }

        $expected = round((float) $expected, 2);

        if (abs($expected - $serverTotal) <= self::TOTAL_TOLERANCE) {
            return null;
        }

        return [
            'type' => OfflineSyncConflict::TYPE_TOTAL_MISMATCH,
            'message' => sprintf(
                'The device charged %s but the server priced the order at %s.',
                number_format($expected, 2),
                number_format($serverTotal, 2),
            ),
            'expected' => ['total' => $expected],
            'actual' => ['total' => $serverTotal],
        ];
    }

    /**
     * Best-effort classification: the raw message is always stored, so an
     * operation that cannot be classified is still fully reviewable.
     */
    protected function classify(ValidationException $e): string
    {
        $message = strtolower($this->firstMessage($e));

        if (array_key_exists('shift', $e->errors())) {
            return OfflineSyncConflict::TYPE_SHIFT_CLOSED;
        }

        if (str_contains($message, 'not available at this branch')) {
            return OfflineSyncConflict::TYPE_PRODUCT_UNAVAILABLE;
        }

        if (str_contains($message, 'stock') || str_contains($message, 'insufficient')) {
            return OfflineSyncConflict::TYPE_STOCK_INSUFFICIENT;
        }

        return OfflineSyncConflict::TYPE_REJECTED;
    }

    /**
     * Record that this order was taken offline. Only written once, so a replayed
     * batch does not rewrite the original capture time.
     *
     * @param  array<string, mixed>  $operation
     */
    protected function markOfflineOrigin(Order $order, array $operation): void
    {
        $reference = $operation['offline_reference'] ?? null;

        if ($reference === null || $order->captured_offline_at !== null) {
            return;
        }

        $order->forceFill([
            'offline_reference' => (string) $reference,
            'captured_offline_at' => $operation['captured_at'] ?? now(),
            'synced_at' => now(),
        ])->save();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    protected function validated(array $payload, array $rules): array
    {
        $validator = Validator::make($payload, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /** @param array<string, mixed> $data */
    protected function branch(User $user, array $data): Branch
    {
        return Branch::query()
            ->where('tenant_id', $user->tenant_id)
            ->findOrFail($data['branch_id']);
    }

    /** @return array<string, mixed> */
    protected function rejected(string $uuid, string $message): array
    {
        return ['uuid' => $uuid, 'status' => 'rejected', 'message' => $message];
    }

    protected function firstMessage(ValidationException $e): string
    {
        foreach ($e->errors() as $messages) {
            if (! empty($messages)) {
                return (string) $messages[0];
            }
        }

        return 'The operation was rejected.';
    }
}
