import { describe, expect, it } from 'vitest';
import fixtures from '../../../tests/Fixtures/pricing/fixtures.json';
import {
    calculateOrder,
    round,
    type OrderTypeKey,
    type PricedLine,
    type PricedOrder,
    type PricingLine,
} from './pricing';

interface FixtureModifier {
    price_delta: number;
    quantity?: number;
}

interface FixtureLine {
    prices: Record<OrderTypeKey, number>;
    quantity: number;
    discount?: number;
    modifiers?: FixtureModifier[];
}

interface Fixture {
    name: string;
    orderType: OrderTypeKey;
    tenant: { tax: { rate: number; inclusive: boolean }; service_charge: { rate: number } };
    options: { discount_type: 'none' | 'amount' | 'percent'; discount_value: number; service_charge: boolean };
    lines: FixtureLine[];
    expected: Record<string, unknown> & { items?: Record<string, number>[] };
}

/**
 * The fixtures are written in the server's snake_case; the offline module is
 * camelCase like the rest of the client code. The maps below are explicit so a
 * new fixture key fails loudly instead of being silently skipped.
 */
const ORDER_KEYS: Record<string, keyof PricedOrder> = {
    subtotal: 'subtotal',
    discount_total: 'discountTotal',
    tax_total: 'taxTotal',
    service_charge: 'serviceCharge',
    total: 'total',
};

const LINE_KEYS: Record<string, keyof PricedLine> = {
    unit_price: 'unitPrice',
    quantity: 'quantity',
    discount_amount: 'discountAmount',
    modifiers_total: 'modifiersTotal',
    line_total: 'lineTotal',
    tax_amount: 'taxAmount',
};

/**
 * The same specification the server is measured against (see
 * tests/Unit/POS/SaleCalculatorParityTest.php). Any divergence between the
 * offline port and the server shows up as a failure in one of the two tests.
 */
const cases = fixtures as unknown as Fixture[];

const toPricingLine = (line: FixtureLine): PricingLine => ({
    prices: line.prices,
    quantity: line.quantity,
    discount: line.discount ?? 0,
    modifiers: (line.modifiers ?? []).map((modifier) => ({
        priceDelta: modifier.price_delta,
        quantity: modifier.quantity ?? 1,
    })),
});

describe('offline pricing mirrors the server', () => {
    it.each(cases.map((fixture) => [fixture.name, fixture] as const))(
        'matches the fixture: %s',
        (_name, fixture) => {
            const result = calculateOrder(
                fixture.lines.map(toPricingLine),
                fixture.orderType,
                {
                    taxRate: fixture.tenant.tax.rate,
                    taxInclusive: fixture.tenant.tax.inclusive,
                    serviceChargeRate: fixture.tenant.service_charge.rate,
                },
                {
                    discountType: fixture.options.discount_type,
                    discountValue: fixture.options.discount_value,
                    serviceCharge: fixture.options.service_charge,
                },
            );

            for (const [key, value] of Object.entries(fixture.expected)) {
                if (key === 'items') {
                    continue;
                }

                const mapped = ORDER_KEYS[key];

                expect(mapped, `unmapped order key "${key}" in fixture "${fixture.name}"`).toBeDefined();
                expect(result[mapped], `${fixture.name} → ${key}`).toBeCloseTo(value as number, 4);
            }

            (fixture.expected.items ?? []).forEach((expectedLine, index) => {
                for (const [key, value] of Object.entries(expectedLine)) {
                    const mapped = LINE_KEYS[key];

                    expect(mapped, `unmapped line key "${key}" in fixture "${fixture.name}"`).toBeDefined();
                    expect(result.items[index][mapped], `${fixture.name} → items.${index}.${key}`).toBeCloseTo(value, 4);
                }
            });
        },
    );
});

describe('rounding', () => {
    it('rounds half away from zero at two decimals, like PHP', () => {
        expect(round(1.005)).toBe(1.01);
        expect(round(0.625)).toBe(0.63);
        expect(round(1.0049)).toBe(1);
        expect(round(0.005)).toBe(0.01);
        expect(round(-1.005)).toBe(-1.01);
    });
});
