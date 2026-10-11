<?php

namespace App\Domain\Delivery;

use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Orders\Models\Order;
use Illuminate\Validation\ValidationException;

/**
 * Delivery zone fees and driver assignment. Third-party marketplace sync and
 * live tracking are out of scope (documented expansion points).
 */
class DeliveryService
{
    public function zone(int $tenantId, ?int $zoneId): ?DeliveryZone
    {
        if (! $zoneId) {
            return null;
        }

        return DeliveryZone::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->findOrFail($zoneId);
    }

    /**
     * Validate the zone's minimum order and return its fee.
     */
    public function feeFor(?DeliveryZone $zone, float $subtotal): float
    {
        if (! $zone) {
            return 0.0;
        }

        if ((float) $zone->min_order > 0 && $subtotal < (float) $zone->min_order) {
            throw ValidationException::withMessages([
                'delivery_zone_id' => 'This zone requires a minimum order of '.number_format((float) $zone->min_order, 2).'.',
            ]);
        }

        return (float) $zone->fee;
    }

    public function assignDriver(Order $order, ?string $name, ?string $phone): Order
    {
        $order->forceFill(['driver_name' => $name, 'driver_phone' => $phone])->save();

        return $order;
    }
}
