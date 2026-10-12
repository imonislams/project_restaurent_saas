<?php

namespace App\Domain\Dining;

use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;

/**
 * Maps the internal order / kitchen lifecycle onto a small, customer-friendly
 * timeline. Labels can be overridden per tenant via `qr.status_labels`.
 */
class CustomerStatusMapper
{
    /** The ordered customer-facing progress steps. */
    public const STEPS = ['received', 'confirmed', 'preparing', 'ready', 'served'];

    public function __construct(protected QrDiningSettings $settings) {}

    /**
     * @return array{key: string, label: string, index: int, steps: list<array{key: string, label: string}>, is_terminal: bool}
     */
    public function map(Order $order): array
    {
        $key = $this->key($order);
        $labels = $this->labels();

        $index = array_search($key, self::STEPS, true);

        return [
            'key' => $key,
            'label' => $labels[$key] ?? $this->defaultLabel($key),
            'index' => $index === false ? -1 : $index,
            'steps' => array_map(fn (string $step) => [
                'key' => $step,
                'label' => $labels[$step] ?? $this->defaultLabel($step),
            ], self::STEPS),
            'is_terminal' => in_array($key, ['completed', 'cancelled', 'rejected'], true),
        ];
    }

    protected function key(Order $order): string
    {
        if ($order->acceptance_status === AcceptanceStatus::Rejected) {
            return 'rejected';
        }

        if ($order->status === OrderStatus::Voided) {
            return 'cancelled';
        }

        if ($order->status === OrderStatus::Completed) {
            return 'completed';
        }

        if ($order->acceptance_status === AcceptanceStatus::Pending) {
            return 'received';
        }

        $ticket = $order->kitchenTicket;

        return match ($ticket?->status) {
            KitchenTicketStatus::Preparing => 'preparing',
            KitchenTicketStatus::Ready => 'ready',
            KitchenTicketStatus::Served => 'served',
            default => 'confirmed',
        };
    }

    /** @return array<string, string> */
    protected function labels(): array
    {
        $labels = $this->settings->statusLabels();

        return is_array($labels) ? $labels : [];
    }

    protected function defaultLabel(string $key): string
    {
        return match ($key) {
            'received' => 'Order received',
            'confirmed' => 'Confirmed',
            'preparing' => 'Being prepared',
            'ready' => 'Ready',
            'served' => 'Served',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'rejected' => 'Rejected',
            default => ucfirst($key),
        };
    }
}
