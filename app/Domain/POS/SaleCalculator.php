<?php

namespace App\Domain\POS;

use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\ProductVariant;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

/**
 * Server-side sale calculator. The browser never dictates prices or totals.
 *
 * Money is rounded to 2 decimals (half-up) at each meaningful step and a single
 * tenant tax rate applies to the whole order.
 */
class SaleCalculator
{
    public function __construct(protected TenantContext $context) {}

    /**
     * @param  list<array{product: Product, variant: ?ProductVariant, quantity: float, discount_amount?: float, notes?: ?string}>  $lines
     * @param  array{discount_type?: string, discount_value?: float, service_charge?: bool}  $options
     * @return array{items: list<array<string, mixed>>, subtotal: float, discount_total: float, tax_total: float, service_charge: float, total: float}
     */
    public function calculate(array $lines, OrderType $type, array $options = []): array
    {
        if ($lines === []) {
            throw ValidationException::withMessages(['items' => 'An order must contain at least one item.']);
        }

        $tenant = $this->context->tenant();
        $taxRate = (float) ($tenant?->getSetting('tax.rate', 0) ?? 0);
        $taxInclusive = (bool) ($tenant?->getSetting('tax.inclusive', false) ?? false);

        $priceColumn = $type->priceColumn();
        $computed = [];

        foreach ($lines as $line) {
            $product = $line['product'];
            $variant = $line['variant'] ?? null;
            $quantity = round((float) $line['quantity'], 3);

            if ($quantity <= 0) {
                throw ValidationException::withMessages(['items' => "Quantity for \"{$product->name}\" must be greater than zero."]);
            }

            $unitPrice = $variant?->price !== null
                ? round((float) $variant->price, 2)
                : round((float) $product->{$priceColumn}, 2);

            $lineSubtotal = round($unitPrice * $quantity, 2);
            $lineDiscount = min(round((float) ($line['discount_amount'] ?? 0), 2), $lineSubtotal);
            $lineNet = round($lineSubtotal - $lineDiscount, 2);

            $computed[] = [
                'product' => $product,
                'variant' => $variant,
                'name' => $product->name.($variant ? ' — '.$variant->name : ''),
                'sku' => $variant?->sku ?? $product->sku,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'unit_cost' => round((float) $product->cost_price, 4),
                'discount_amount' => $lineDiscount,
                'tax_rate' => $taxRate,
                'line_net' => $lineNet,
                'notes' => $line['notes'] ?? null,
            ];
        }

        $subtotal = round(array_sum(array_column($computed, 'line_net')), 2);

        $discountType = $options['discount_type'] ?? 'none';
        $discountValue = (float) ($options['discount_value'] ?? 0);
        $orderDiscount = match ($discountType) {
            'percent' => round($subtotal * min($discountValue, 100) / 100, 2),
            'amount' => min(round($discountValue, 2), $subtotal),
            default => 0.0,
        };

        $taxedBase = round($subtotal - $orderDiscount, 2);

        if ($taxInclusive && $taxRate > 0) {
            $taxTotal = round($taxedBase * $taxRate / (100 + $taxRate), 2);
            $netBeforeTax = round($taxedBase - $taxTotal, 2);
        } else {
            $taxTotal = round($taxedBase * $taxRate / 100, 2);
            $netBeforeTax = $taxedBase;
        }

        $serviceChargeRate = (bool) ($options['service_charge'] ?? false)
            ? (float) ($tenant?->getSetting('service_charge.rate', 0) ?? 0)
            : 0.0;
        $serviceCharge = round($netBeforeTax * $serviceChargeRate / 100, 2);

        $total = $taxInclusive
            ? round($taxedBase + $serviceCharge, 2)
            : round($taxedBase + $taxTotal + $serviceCharge, 2);

        // Allocate tax/line totals back onto the lines for reporting.
        $items = [];
        foreach ($computed as $row) {
            $share = $subtotal > 0 ? $row['line_net'] / $subtotal : 0;
            $lineTax = round($taxTotal * $share, 2);

            $items[] = [
                'product' => $row['product'],
                'variant' => $row['variant'],
                'name' => $row['name'],
                'sku' => $row['sku'],
                'quantity' => $row['quantity'],
                'unit_price' => $row['unit_price'],
                'unit_cost' => $row['unit_cost'],
                'discount_amount' => $row['discount_amount'],
                'tax_rate' => $row['tax_rate'],
                'tax_amount' => $lineTax,
                'line_total' => $row['line_net'],
                'notes' => $row['notes'],
            ];
        }

        return [
            'items' => $items,
            'subtotal' => $subtotal,
            'discount_total' => round($orderDiscount + array_sum(array_column($computed, 'discount_amount')), 2),
            'tax_total' => $taxTotal,
            'service_charge' => $serviceCharge,
            'total' => $total,
        ];
    }
}
