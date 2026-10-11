import { useT } from '@/i18n';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Branch {
    id: number;
    name: string;
}

interface ShiftInfo {
    id: number;
    opening_float: number;
    expected_cash: number;
    opened_at: string | null;
    opened_by: string | null;
}

interface Variant {
    id: number;
    name: string;
    price: number | null;
}

interface Product {
    id: number;
    name: string;
    category_id: number | null;
    price_dine_in: number;
    price_takeaway: number;
    price_delivery: number;
    is_available: boolean;
    variants: Variant[];
}

interface CartLine {
    key: string;
    product_id: number;
    variant_id: number | null;
    name: string;
    unit_price: number;
    quantity: number;
    discount_amount: number;
    notes: string | null;
}

type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'counter';

const ORDER_TYPES: { value: OrderType; key: string }[] = [
    { value: 'dine_in', key: 'pos.dine_in' },
    { value: 'takeaway', key: 'pos.takeaway' },
    { value: 'delivery', key: 'pos.delivery' },
    { value: 'counter', key: 'pos.counter' },
];

const money = (n: number, currency: string) =>
    `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PosIndex({
    branches,
    branch,
    shift,
    products,
    categories,
    paymentMethods,
    tables,
    taxInclusive,
    taxRate,
    serviceChargeRate,
}: {
    branches: Branch[];
    branch: { id: number; name: string; currency: string } | null;
    shift: ShiftInfo | null;
    products: Product[];
    categories: { id: number; name: string }[];
    paymentMethods: { id: number; name: string; type: string }[];
    tables: { id: number; name: string; seats: number; status: string }[];
    taxInclusive: boolean;
    taxRate: number;
    serviceChargeRate: number;
}) {
    const { flash } = usePage().props;
    const t = useT();
    const currency = branch?.currency ?? '';

    const [cart, setCart] = useState<CartLine[]>([]);
    const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
    const [search, setSearch] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('dine_in');
    const [tableId, setTableId] = useState<number | ''>('');
    const [covers, setCovers] = useState<number>(2);
    const [customerName, setCustomerName] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [showShift, setShowShift] = useState(false);
    const [discountType, setDiscountType] = useState<'none' | 'amount' | 'percent'>('none');
    const [discountValue, setDiscountValue] = useState(0);
    const [serviceCharge, setServiceCharge] = useState(false);
    const [managerPin, setManagerPin] = useState('');
    const [error, setError] = useState<string | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);

    const priceFor = (product: Product) => {
        switch (orderType) {
            case 'takeaway':
                return product.price_takeaway;
            case 'delivery':
                return product.price_delivery;
            default:
                return product.price_dine_in;
        }
    };

    const filtered = useMemo(
        () =>
            products.filter(
                (p) =>
                    (activeCategory === 'all' || p.category_id === activeCategory) &&
                    p.name.toLowerCase().includes(search.toLowerCase()),
            ),
        [products, activeCategory, search],
    );

    const totals = useMemo(() => {
        const subtotal = cart.reduce(
            (sum, line) => sum + line.unit_price * line.quantity - line.discount_amount,
            0,
        );
        const orderDiscount =
            discountType === 'percent'
                ? (subtotal * Math.min(discountValue, 100)) / 100
                : discountType === 'amount'
                  ? Math.min(discountValue, subtotal)
                  : 0;
        const taxedBase = subtotal - orderDiscount;
        const tax =
            taxInclusive && taxRate > 0
                ? (taxedBase * taxRate) / (100 + taxRate)
                : (taxedBase * taxRate) / 100;
        const netBeforeTax = taxInclusive ? taxedBase - tax : taxedBase;
        const sc = serviceCharge ? (netBeforeTax * serviceChargeRate) / 100 : 0;
        const total = taxInclusive ? taxedBase + sc : taxedBase + tax + sc;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            discount: Math.round((orderDiscount + cart.reduce((s, l) => s + l.discount_amount, 0)) * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            serviceCharge: Math.round(sc * 100) / 100,
            total: Math.round(total * 100) / 100,
        };
    }, [cart, discountType, discountValue, serviceCharge, taxInclusive, taxRate, serviceChargeRate]);

    const addToCart = (product: Product, variant: Variant | null) => {
        const key = `${product.id}-${variant?.id ?? 'base'}`;
        const price = variant?.price ?? priceFor(product);

        setCart((prev) => {
            const existing = prev.find((l) => l.key === key);
            if (existing) {
                return prev.map((l) =>
                    l.key === key ? { ...l, quantity: l.quantity + 1 } : l,
                );
            }
            return [
                ...prev,
                {
                    key,
                    product_id: product.id,
                    variant_id: variant?.id ?? null,
                    name: variant ? `${product.name} — ${variant.name}` : product.name,
                    unit_price: price,
                    quantity: 1,
                    discount_amount: 0,
                    notes: null,
                },
            ];
        });
    };

    const updateQty = (key: string, delta: number) =>
        setCart((prev) =>
            prev
                .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
                .filter((l) => l.quantity > 0),
        );

    // Keyboard shortcuts.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'F4') {
                e.preventDefault();
                if (cart.length > 0 && shift) setShowPayment(true);
            } else if (e.key === 'Escape') {
                setShowPayment(false);
                setShowShift(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [cart.length, shift]);

    if (!branch) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600">
                No branch available for POS.
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
            <Head title="POS Terminal" />

            {/* Top bar */}
            <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">POS</span>
                    <select
                        className="rounded-md border-gray-300 py-1 text-sm"
                        value={branch.id}
                        onChange={(e) =>
                            router.get(route('pos.index'), { branch_id: e.target.value }, { preserveScroll: true })
                        }
                    >
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                    {shift ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                            {t('pos.shift_open')} · {shift.opened_by}
                        </span>
                    ) : (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                            {t('pos.no_shift')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <a href={route('orders.index')} className="text-sm text-gray-600 hover:text-gray-800">
                        {t('pos.orders_link')}
                    </a>
                    <button
                        onClick={() => setShowShift(true)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        {shift ? 'Shift / Drawer' : t('pos.open_shift')}
                    </button>
                </div>
            </header>

            {(flash?.success || error) && (
                <div
                    className={
                        'px-4 py-2 text-sm ' +
                        (error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800')
                    }
                >
                    {error ?? flash?.success}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Categories */}
                <aside className="w-44 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-2">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={
                            'mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ' +
                            (activeCategory === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50')
                        }
                    >
                        All items
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCategory(c.id)}
                            className={
                                'mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ' +
                                (activeCategory === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50')
                            }
                        >
                            {c.name}
                        </button>
                    ))}
                </aside>

                {/* Product grid */}
                <main className="flex flex-1 flex-col overflow-hidden">
                    <div className="border-b border-gray-200 bg-white p-2">
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder={t('pos.search') + '  (F2)'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filtered.map((product) => (
                            <div key={product.id} className="rounded-lg border border-gray-200 bg-white p-3">
                                <button
                                    disabled={!product.is_available}
                                    onClick={() => addToCart(product, null)}
                                    className="w-full text-left disabled:opacity-40"
                                >
                                    <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-800">
                                        {product.name}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-600">
                                        {money(priceFor(product), currency)}
                                    </div>
                                </button>
                                {product.variants.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {product.variants.map((v) => (
                                            <button
                                                key={v.id}
                                                disabled={!product.is_available}
                                                onClick={() => addToCart(product, v)}
                                                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200 disabled:opacity-40"
                                            >
                                                {v.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <p className="col-span-full py-10 text-center text-sm text-gray-500">
                                {t('pos.no_products')}
                            </p>
                        )}
                    </div>
                </main>

                {/* Cart */}
                <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white">
                    <div className="border-b border-gray-200 p-3">
                        <div className="mb-2 flex gap-1">
                            {ORDER_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setOrderType(type.value)}
                                    className={
                                        'flex-1 rounded-md px-2 py-1 text-xs font-medium ' +
                                        (orderType === type.value
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700')
                                    }
                                >
                                    {t(type.key)}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder={t('pos.customer')}
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full rounded-md border-gray-300 text-sm"
                        />
                        {orderType === 'dine_in' && tables.length > 0 && (
                            <div className="mt-2 flex gap-2">
                                <select
                                    className="flex-1 rounded-md border-gray-300 text-sm"
                                    value={tableId}
                                    onChange={(e) =>
                                        setTableId(e.target.value ? Number(e.target.value) : '')
                                    }
                                >
                                    <option value="">{t('pos.no_table')}</option>
                                    {tables.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.seats}p, {t.status})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min={1}
                                    title="Covers"
                                    value={covers}
                                    onChange={(e) => setCovers(Number(e.target.value))}
                                    className="w-20 rounded-md border-gray-300 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        {cart.length === 0 ? (
                            <p className="py-10 text-center text-sm text-gray-400">
                                {t('pos.cart_empty')}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {cart.map((line) => (
                                    <li key={line.key} className="rounded-md border border-gray-100 p-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-gray-800">{line.name}</span>
                                            <button
                                                onClick={() =>
                                                    setCart((prev) => prev.filter((l) => l.key !== line.key))
                                                }
                                                className="text-xs text-red-500"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQty(line.key, -1)}
                                                    className="h-6 w-6 rounded bg-gray-100 text-gray-700"
                                                >
                                                    −
                                                </button>
                                                <span className="w-8 text-center text-sm">{line.quantity}</span>
                                                <button
                                                    onClick={() => updateQty(line.key, 1)}
                                                    className="h-6 w-6 rounded bg-gray-100 text-gray-700"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <span className="text-sm text-gray-700">
                                                {money(line.unit_price * line.quantity, currency)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-gray-200 p-3 text-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <select
                                className="rounded-md border-gray-300 py-1 text-xs"
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as any)}
                            >
                                <option value="none">No discount</option>
                                <option value="amount">Discount amount</option>
                                <option value="percent">Discount %</option>
                            </select>
                            {discountType !== 'none' && (
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                    className="w-24 rounded-md border-gray-300 py-1 text-xs"
                                />
                            )}
                        </div>

                        {serviceChargeRate > 0 && (
                            <label className="mb-2 flex items-center gap-2 text-xs text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={serviceCharge}
                                    onChange={(e) => setServiceCharge(e.target.checked)}
                                />
                                Apply service charge ({serviceChargeRate}%)
                            </label>
                        )}

                        <dl className="space-y-1">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Subtotal</dt>
                                <dd>{money(totals.subtotal, currency)}</dd>
                            </div>
                            {totals.discount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <dt>Discount</dt>
                                    <dd>−{money(totals.discount, currency)}</dd>
                                </div>
                            )}
                            {totals.tax > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Tax</dt>
                                    <dd>{money(totals.tax, currency)}</dd>
                                </div>
                            )}
                            {totals.serviceCharge > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Service</dt>
                                    <dd>{money(totals.serviceCharge, currency)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-semibold">
                                <dt>Total</dt>
                                <dd>{money(totals.total, currency)}</dd>
                            </div>
                        </dl>

                        <button
                            disabled={cart.length === 0 || !shift}
                            onClick={() => setShowPayment(true)}
                            className="mt-3 w-full rounded-md bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {t('pos.pay')} (F4)
                        </button>
                        {orderType === 'dine_in' && (
                            <button
                                disabled={cart.length === 0 || !shift}
                                onClick={() => {
                                    setError(null);
                                    router.post(
                                        route('pos.orders.open'),
                                        {
                                            branch_id: branch.id,
                                            shift_id: shift?.id,
                                            order_type: orderType,
                                            table_id: tableId || null,
                                            covers,
                                            customer_name: customerName || null,
                                            discount_type: discountType,
                                            discount_value: discountValue,
                                            service_charge: serviceCharge,
                                            items: cart.map((l) => ({
                                                product_id: l.product_id,
                                                variant_id: l.variant_id,
                                                quantity: l.quantity,
                                                discount_amount: l.discount_amount,
                                                notes: l.notes,
                                            })),
                                        },
                                        {
                                            onError: (errors) =>
                                                setError(Object.values(errors)[0] ?? 'Could not open the order.'),
                                        },
                                    );
                                }}
                                className="mt-2 w-full rounded-md border border-indigo-300 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                            >
                                {t('pos.open_order')}
                            </button>
                        )}
                        {cart.length > 0 && (
                            <button
                                onClick={() => setCart([])}
                                className="mt-2 w-full rounded-md border border-gray-300 py-2 text-sm text-gray-600"
                            >
                                {t('pos.clear_cart')}
                            </button>
                        )}
                    </div>
                </aside>
            </div>

            {showPayment && (
                <PaymentModal
                    currency={currency}
                    total={totals.total}
                    paymentMethods={paymentMethods}
                    managerPin={managerPin}
                    setManagerPin={setManagerPin}
                    onClose={() => setShowPayment(false)}
                    onError={setError}
                    buildPayload={() => ({
                        branch_id: branch.id,
                        shift_id: shift?.id,
                        order_type: orderType,
                        table_id: tableId || null,
                        covers: orderType === 'dine_in' ? covers : null,
                        customer_name: customerName || null,
                        discount_type: discountType,
                        discount_value: discountValue,
                        service_charge: serviceCharge,
                        manager_pin: managerPin || null,
                        items: cart.map((l) => ({
                            product_id: l.product_id,
                            variant_id: l.variant_id,
                            quantity: l.quantity,
                            discount_amount: l.discount_amount,
                            notes: l.notes,
                        })),
                    })}
                />
            )}

            {showShift && (
                <ShiftModal
                    branchId={branch.id}
                    shift={shift}
                    onClose={() => setShowShift(false)}
                />
            )}
        </div>
    );
}

function PaymentModal({
    currency,
    total,
    paymentMethods,
    managerPin,
    setManagerPin,
    onClose,
    onError,
    buildPayload,
}: {
    currency: string;
    total: number;
    paymentMethods: { id: number; name: string; type: string }[];
    managerPin: string;
    setManagerPin: (v: string) => void;
    onClose: () => void;
    onError: (v: string | null) => void;
    buildPayload: () => Record<string, unknown>;
}) {
    const [methodId, setMethodId] = useState<number | ''>(paymentMethods[0]?.id ?? '');
    const [tendered, setTendered] = useState<number>(total);
    const form = useForm({});

    const method = paymentMethods.find((m) => m.id === methodId);
    const isCash = method?.type === 'cash';
    const change = isCash ? Math.max(0, tendered - total) : 0;

    const submit = () => {
        onError(null);
        const payload = {
            ...buildPayload(),
            payments: [
                {
                    payment_method_id: methodId,
                    amount: total,
                    tendered: isCash ? tendered : null,
                },
            ],
            idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };

        form.transform(() => payload);

        form.post(route('pos.orders.store'), {
            onError: (errors: Record<string, string>) =>
                onError(Object.values(errors)[0] ?? 'Could not complete the sale.'),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900">Payment</h3>

                <div className="mt-4 flex justify-between border-b border-gray-100 pb-3 text-lg font-semibold">
                    <span>Total due</span>
                    <span>{money(total, currency)}</span>
                </div>

                <div className="mt-4 space-y-3">
                    <div>
                        <label className="text-sm text-gray-700">Payment method</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300"
                            value={methodId}
                            onChange={(e) => setMethodId(Number(e.target.value))}
                        >
                            {paymentMethods.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isCash && (
                        <div>
                            <label className="text-sm text-gray-700">Cash received</label>
                            <input
                                type="number"
                                step="0.01"
                                className="mt-1 block w-full rounded-md border-gray-300"
                                value={tendered}
                                onChange={(e) => setTendered(Number(e.target.value))}
                            />
                            <p className="mt-1 text-sm text-gray-600">
                                Change due: <strong>{money(change, currency)}</strong>
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-gray-700">
                            Manager PIN (required for large discounts)
                        </label>
                        <input
                            type="password"
                            className="mt-1 block w-full rounded-md border-gray-300"
                            value={managerPin}
                            onChange={(e) => setManagerPin(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={form.processing}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Complete sale
                    </button>
                </div>
            </div>
        </div>
    );
}

function ShiftModal({
    branchId,
    shift,
    onClose,
}: {
    branchId: number;
    shift: ShiftInfo | null;
    onClose: () => void;
}) {
    const openForm = useForm({ branch_id: branchId, opening_float: 0 });
    const closeForm = useForm({ counted_cash: 0, manager_pin: '', notes: '' });
    const cashForm = useForm({ direction: 'in', amount: 0, reason: '' });

    if (!shift) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                    <h3 className="text-base font-semibold text-gray-900">Open shift</h3>
                    <div className="mt-4">
                        <label className="text-sm text-gray-700">Opening float</label>
                        <input
                            type="number"
                            step="0.01"
                            className="mt-1 block w-full rounded-md border-gray-300"
                            value={openForm.data.opening_float}
                            onChange={(e) => openForm.setData('opening_float', Number(e.target.value))}
                        />
                        {openForm.errors.opening_float && (
                            <p className="mt-1 text-sm text-red-600">{openForm.errors.opening_float}</p>
                        )}
                        {(openForm.errors as Record<string, string>).shift && (
                            <p className="mt-1 text-sm text-red-600">
                                {(openForm.errors as Record<string, string>).shift}
                            </p>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">
                            Cancel
                        </button>
                        <button
                            onClick={() =>
                                openForm.post(route('shifts.open'), { onSuccess: onClose })
                            }
                            disabled={openForm.processing}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Open shift
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900">Shift &amp; drawer</h3>
                <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-gray-500">Opening float</dt>
                        <dd>{shift.opening_float.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between font-medium">
                        <dt className="text-gray-500">Expected cash</dt>
                        <dd>{shift.expected_cash.toFixed(2)}</dd>
                    </div>
                </dl>

                <div className="mt-4 rounded-md border border-gray-100 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-700">Cash movement</p>
                    <div className="flex gap-2">
                        <select
                            className="rounded-md border-gray-300 text-sm"
                            value={cashForm.data.direction}
                            onChange={(e) => cashForm.setData('direction', e.target.value)}
                        >
                            <option value="in">Cash in</option>
                            <option value="out">Cash out</option>
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            className="w-24 rounded-md border-gray-300 text-sm"
                            value={cashForm.data.amount}
                            onChange={(e) => cashForm.setData('amount', Number(e.target.value))}
                        />
                        <input
                            placeholder="Reason"
                            className="flex-1 rounded-md border-gray-300 text-sm"
                            value={cashForm.data.reason}
                            onChange={(e) => cashForm.setData('reason', e.target.value)}
                        />
                        <button
                            onClick={() => cashForm.post(route('shifts.movements.store', shift.id))}
                            className="rounded-md bg-gray-800 px-3 py-1 text-sm text-white"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="mt-4 rounded-md border border-gray-100 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-700">Close shift</p>
                    <label className="text-xs text-gray-500">Counted cash</label>
                    <input
                        type="number"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        value={closeForm.data.counted_cash}
                        onChange={(e) => closeForm.setData('counted_cash', Number(e.target.value))}
                    />
                    <input
                        type="password"
                        placeholder="Manager PIN (if variance is large)"
                        className="mt-2 block w-full rounded-md border-gray-300 text-sm"
                        value={closeForm.data.manager_pin}
                        onChange={(e) => closeForm.setData('manager_pin', e.target.value)}
                    />
                    {Object.values(closeForm.errors)[0] && (
                        <p className="mt-1 text-sm text-red-600">{Object.values(closeForm.errors)[0]}</p>
                    )}
                    <button
                        onClick={() =>
                            closeForm.post(route('shifts.close', shift.id), { onSuccess: onClose })
                        }
                        className="mt-2 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        Close shift &amp; reconcile
                    </button>
                </div>

                <div className="mt-4 flex justify-end">
                    <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
