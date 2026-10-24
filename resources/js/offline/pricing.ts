export type OrderTypeKey = 'dine_in' | 'takeaway' | 'delivery';

export interface ModifierDelta {
    priceDelta: number;
    quantity?: number;
}

export interface PricingLine {
    /** Price per order type, exactly as the server snapshot delivered it. */
    prices: Record<OrderTypeKey, number>;
    /** A chosen variant's price takes precedence over the product price. */
    variantPrice?: number | null;
    quantity: number;
    discount?: number;
    modifiers?: ModifierDelta[];
}

export interface PricingSettings {
    taxRate: number;
    taxInclusive: boolean;
    serviceChargeRate: number;
}

export interface PricingOptions {
    discountType?: 'none' | 'amount' | 'percent';
    discountValue?: number;
    serviceCharge?: boolean;
}

export interface PricedLine {
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    modifiersTotal: number;
    lineTotal: number;
    taxAmount: number;
}

export interface PricedOrder {
    items: PricedLine[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    serviceCharge: number;
    total: number;
}

/**
 * Rounds half away from zero, matching PHP's round() — including its pre-rounding
 * correction. Without the nudge, a line of 0.67 x 1.5 (= 1.005, held as
 * 1.00499999…) would round down in JavaScript and up on the server.
 */
export function round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    const scaled = value * factor;

    if (!Number.isFinite(scaled)) {
        return value;
    }

    const nudged = scaled + Math.sign(scaled) * 1e-9;

    return (Math.sign(nudged) * Math.round(Math.abs(nudged))) / factor;
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

/**
 * Mirrors App\Domain\POS\SaleCalculator exactly; the two are kept honest by the
 * shared fixtures in tests/Fixtures/pricing. The result is *provisional*: the
 * server prices the order again when it is synced, and its total wins.
 */
export function calculateOrder(
    lines: PricingLine[],
    orderType: OrderTypeKey,
    settings: PricingSettings,
    options: PricingOptions = {},
): PricedOrder {
    if (lines.length === 0) {
        throw new Error('An order must contain at least one item.');
    }

    const computed = lines.map((line) => {
        const quantity = round(line.quantity, 3);
        const basePrice = round(line.variantPrice ?? line.prices[orderType], 2);

        let modifierDelta = 0;

        for (const modifier of line.modifiers ?? []) {
            modifierDelta += round(modifier.priceDelta * (modifier.quantity ?? 1), 2);
        }

        modifierDelta = round(modifierDelta, 2);

        const unitPrice = round(basePrice + modifierDelta, 2);
        const lineSubtotal = round(unitPrice * quantity, 2);
        const lineDiscount = Math.min(round(line.discount ?? 0, 2), lineSubtotal);
        const lineNet = round(lineSubtotal - lineDiscount, 2);

        return {
            quantity,
            unitPrice,
            lineDiscount,
            lineNet,
            modifiersTotal: round(modifierDelta * quantity, 2),
        };
    });

    const subtotal = round(sum(computed.map((row) => row.lineNet)), 2);

    const discountType = options.discountType ?? 'none';
    const discountValue = options.discountValue ?? 0;

    const orderDiscount =
        discountType === 'percent'
            ? round((subtotal * Math.min(discountValue, 100)) / 100, 2)
            : discountType === 'amount'
              ? Math.min(round(discountValue, 2), subtotal)
              : 0;

    const taxedBase = round(subtotal - orderDiscount, 2);

    let taxTotal: number;
    let netBeforeTax: number;

    if (settings.taxInclusive && settings.taxRate > 0) {
        taxTotal = round((taxedBase * settings.taxRate) / (100 + settings.taxRate), 2);
        netBeforeTax = round(taxedBase - taxTotal, 2);
    } else {
        taxTotal = round((taxedBase * settings.taxRate) / 100, 2);
        netBeforeTax = taxedBase;
    }

    const serviceChargeRate = options.serviceCharge ? settings.serviceChargeRate : 0;
    const serviceCharge = round((netBeforeTax * serviceChargeRate) / 100, 2);

    const total = settings.taxInclusive
        ? round(taxedBase + serviceCharge, 2)
        : round(taxedBase + taxTotal + serviceCharge, 2);

    const items = computed.map((row) => ({
        unitPrice: row.unitPrice,
        quantity: row.quantity,
        discountAmount: row.lineDiscount,
        modifiersTotal: row.modifiersTotal,
        lineTotal: row.lineNet,
        taxAmount: round(taxTotal * (subtotal > 0 ? row.lineNet / subtotal : 0), 2),
    }));

    return {
        items,
        subtotal,
        discountTotal: round(orderDiscount + sum(computed.map((row) => row.lineDiscount)), 2),
        taxTotal,
        serviceCharge,
        total,
    };
}
