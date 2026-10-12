import Icon from '@/Components/Icon';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { useT } from '@/i18n';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

// --- Interfaces ---

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

interface ModifierOption {
    id: number;
    name: string;
    price_delta: number;
}

interface ModifierGroup {
    id: number;
    name: string;
    selection_type: string;
    min_select: number;
    max_select: number;
    is_required: boolean;
    options: ModifierOption[];
}

interface SelectedModifier {
    option_id: number;
    name: string;
    price_delta: number;
    quantity: number;
}

interface Product {
    id: number;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    category_id: number | null;
    price_dine_in: number;
    price_takeaway: number;
    price_delivery: number;
    is_available: boolean;
    variants: Variant[];
    modifier_groups: ModifierGroup[];
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
    modifiers: SelectedModifier[];
}

interface PaymentMethod {
    id: number;
    name: string;
    type: string;
}

interface TableInfo {
    id: number;
    name: string;
    seats: number;
    status: string;
}

interface CustomerInfo {
    id: number;
    name: string;
    phone?: string | null;
}

interface DeliveryZoneInfo {
    id: number;
    name: string;
    fee: number;
}

interface OpenOrderSummary {
    id: number;
    order_number: string;
    table_name: string | null;
    customer_name: string | null;
    order_type: string;
    total: number;
    items_count: number;
    placed_at: string;
}

type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'counter';

const ORDER_TYPES: { value: OrderType; key: string; icon: 'table' | 'cart' | 'truck' | 'wallet' }[] = [
    { value: 'dine_in', key: 'pos.dine_in', icon: 'table' },
    { value: 'takeaway', key: 'pos.takeaway', icon: 'cart' },
    { value: 'delivery', key: 'pos.delivery', icon: 'truck' },
    { value: 'counter', key: 'pos.counter', icon: 'wallet' },
];

const money = (n: number, currency: string) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Web Audio API beep generator for snappy cashier feedback (zero external audio files needed)
function playTone(type: 'tap' | 'add' | 'success' | 'alert') {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'tap') {
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'add') {
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880, now + 0.08); // A5
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'alert') {
            osc.frequency.setValueAtTime(320, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch {
        // AudioContext disabled or blocked by browser policy
    }
}

export default function PosIndex({
    branches,
    branch,
    shift,
    products,
    categories,
    paymentMethods,
    tables,
    customers = [],
    deliveryZones = [],
    taxInclusive,
    taxRate,
    serviceChargeRate,
    openOrders = [],
}: {
    branches: Branch[];
    branch: { id: number; name: string; currency: string } | null;
    shift: ShiftInfo | null;
    products: Product[];
    categories: { id: number; name: string; products_count?: number }[];
    paymentMethods: PaymentMethod[];
    tables: TableInfo[];
    customers?: CustomerInfo[];
    deliveryZones?: DeliveryZoneInfo[];
    taxInclusive: boolean;
    taxRate: number;
    serviceChargeRate: number;
    openOrders?: OpenOrderSummary[];
}) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const t = useT();
    const currency = branch?.currency ?? '$';

    // State
    const [cart, setCart] = useState<CartLine[]>([]);
    const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
    const [search, setSearch] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('dine_in');
    const [tableId, setTableId] = useState<number | ''>('');
    const [covers, setCovers] = useState<number>(2);
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState<number | ''>('');
    const [deliveryZoneId, setDeliveryZoneId] = useState<number | ''>('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [orderNotes, setOrderNotes] = useState('');

    // Modals & Panels
    const [showPayment, setShowPayment] = useState(false);
    const [showShift, setShowShift] = useState(false);
    const [showHeldOrders, setShowHeldOrders] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
    const [itemNoteInput, setItemNoteInput] = useState('');
    const [configuring, setConfiguring] = useState<{ product: Product; variant: Variant | null } | null>(null);
    const [selectedModifiers, setSelectedModifiers] = useState<Record<number, number[]>>({});

    // Pricing & Discounts
    const [discountType, setDiscountType] = useState<'none' | 'amount' | 'percent'>('none');
    const [discountValue, setDiscountValue] = useState(0);
    const [serviceCharge, setServiceCharge] = useState(false);
    const [managerPin, setManagerPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const searchRef = useRef<HTMLInputElement>(null);

    const playSound = (kind: 'tap' | 'add' | 'success' | 'alert') => {
        if (soundEnabled) playTone(kind);
    };

    // Calculate effective unit price by order type
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

    // Filtered products list
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((p) => {
            const matchesCat = activeCategory === 'all' || p.category_id === activeCategory;
            if (!matchesCat) return false;
            if (!query) return true;
            return (
                p.name.toLowerCase().includes(query) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.barcode && p.barcode.toLowerCase().includes(query))
            );
        });
    }, [products, activeCategory, search]);

    // Selected delivery zone fee
    const deliveryFee = useMemo(() => {
        if (orderType !== 'delivery' || !deliveryZoneId) return 0;
        const zone = deliveryZones.find((z) => z.id === deliveryZoneId);
        return zone ? zone.fee : 0;
    }, [orderType, deliveryZoneId, deliveryZones]);

    // Financial totals calculation
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

        const baseForTax = Math.max(0, subtotal - orderDiscount);

        const tax =
            taxInclusive && taxRate > 0
                ? (baseForTax * taxRate) / (100 + taxRate)
                : (baseForTax * taxRate) / 100;

        const netBeforeTax = taxInclusive ? baseForTax - tax : baseForTax;
        const sc = serviceCharge && serviceChargeRate > 0 ? (netBeforeTax * serviceChargeRate) / 100 : 0;
        const total = (taxInclusive ? baseForTax + sc : baseForTax + tax + sc) + deliveryFee;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            discount: Math.round((orderDiscount + cart.reduce((s, l) => s + l.discount_amount, 0)) * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            serviceCharge: Math.round(sc * 100) / 100,
            deliveryFee: Math.round(deliveryFee * 100) / 100,
            total: Math.round(total * 100) / 100,
        };
    }, [cart, discountType, discountValue, serviceCharge, taxInclusive, taxRate, serviceChargeRate, deliveryFee]);

    // Cart operations
    const addToCart = (product: Product, variant: Variant | null, modifiers: SelectedModifier[] = []) => {
        playSound('add');
        const signature = modifiers.map((m) => m.option_id).sort((a, b) => a - b).join('.');
        const key = `${product.id}-${variant?.id ?? 'base'}${signature ? `-m${signature}` : ''}`;
        const modifierDelta = modifiers.reduce((sum, m) => sum + m.price_delta * m.quantity, 0);
        const price = Math.round(((variant?.price ?? priceFor(product)) + modifierDelta) * 100) / 100;

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
                    name: variant ? `${product.name} (${variant.name})` : product.name,
                    unit_price: price,
                    quantity: 1,
                    discount_amount: 0,
                    notes: null,
                    modifiers,
                },
            ];
        });
    };

    // Products with modifier groups open a configuration modal; others add directly.
    const addOrConfigure = (product: Product, variant: Variant | null) => {
        if ((product.modifier_groups ?? []).length > 0) {
            setSelectedModifiers({});
            setConfiguring({ product, variant });
            return;
        }
        addToCart(product, variant);
    };

    const toggleModifier = (group: ModifierGroup, optionId: number) => {
        setSelectedModifiers((prev) => {
            const current = prev[group.id] ?? [];
            if (group.selection_type === 'single') {
                return { ...prev, [group.id]: current.includes(optionId) ? [] : [optionId] };
            }
            if (current.includes(optionId)) {
                return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
            }
            if (current.length >= group.max_select) {
                return prev;
            }
            return { ...prev, [group.id]: [...current, optionId] };
        });
    };

    const configureValid = configuring
        ? (configuring.product.modifier_groups ?? []).every((group) => {
              const count = (selectedModifiers[group.id] ?? []).length;
              return count >= group.min_select && count <= group.max_select;
          })
        : true;

    const configureDelta = configuring
        ? (configuring.product.modifier_groups ?? []).reduce((sum, group) => {
              const selected = selectedModifiers[group.id] ?? [];
              return sum + group.options.filter((o) => selected.includes(o.id)).reduce((s, o) => s + o.price_delta, 0);
          }, 0)
        : 0;

    const confirmConfigure = () => {
        if (!configuring || !configureValid) return;
        const { product, variant } = configuring;
        const selected: SelectedModifier[] = [];
        for (const group of product.modifier_groups ?? []) {
            for (const optionId of selectedModifiers[group.id] ?? []) {
                const option = group.options.find((o) => o.id === optionId);
                if (option) {
                    selected.push({ option_id: option.id, name: option.name, price_delta: option.price_delta, quantity: 1 });
                }
            }
        }
        addToCart(product, variant, selected);
        setConfiguring(null);
        setSelectedModifiers({});
    };

    const updateQty = (key: string, delta: number) => {
        playSound('tap');
        setCart((prev) =>
            prev
                .map((l) => (l.key === key ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
                .filter((l) => l.quantity > 0),
        );
    };

    const setDirectQty = (key: string, qty: number) => {
        if (qty <= 0) {
            setCart((prev) => prev.filter((l) => l.key !== key));
        } else {
            setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: qty } : l)));
        }
    };

    const removeLine = (key: string) => {
        playSound('tap');
        setCart((prev) => prev.filter((l) => l.key !== key));
    };

    const openNoteModal = (line: CartLine) => {
        setEditingNoteKey(line.key);
        setItemNoteInput(line.notes || '');
    };

    const saveItemNote = () => {
        if (!editingNoteKey) return;
        setCart((prev) =>
            prev.map((l) =>
                l.key === editingNoteKey ? { ...l, notes: itemNoteInput.trim() || null } : l,
            ),
        );
        setEditingNoteKey(null);
        setItemNoteInput('');
    };

    // Barcode scanner / Enter key handler in search box
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = search.trim().toLowerCase();
            if (!term) return;

            // Direct barcode or SKU match
            const exact = products.find(
                (p) =>
                    (p.barcode && p.barcode.toLowerCase() === term) ||
                    (p.sku && p.sku.toLowerCase() === term),
            );

            if (exact && exact.is_available) {
                addToCart(exact, null);
                setSearch('');
                return;
            }

            // Single filtered match
            if (filtered.length === 1 && filtered[0].is_available) {
                addToCart(filtered[0], null);
                setSearch('');
            }
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'F4') {
                e.preventDefault();
                if (cart.length > 0 && shift) {
                    setShowPayment(true);
                } else if (!shift) {
                    setShowShift(true);
                }
            } else if (e.key === 'F8') {
                e.preventDefault();
                if (cart.length > 0 && shift && orderType === 'dine_in') {
                    handleHoldOrder();
                }
            } else if (e.key === 'Escape') {
                setShowPayment(false);
                setShowShift(false);
                setShowHeldOrders(false);
                setShowShortcuts(false);
                setEditingNoteKey(null);
            } else if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setShowShortcuts(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [cart.length, shift, orderType]);

    // Hold / Park Dine-in or Open Order
    const handleHoldOrder = () => {
        if (cart.length === 0 || !shift || !branch) return;
        setError(null);
        router.post(
            route('pos.orders.open'),
            {
                branch_id: branch.id,
                shift_id: shift.id,
                order_type: orderType,
                table_id: tableId || null,
                covers: orderType === 'dine_in' ? covers : null,
                customer_name: customerName || null,
                customer_id: customerId || null,
                notes: orderNotes || null,
                discount_type: discountType,
                discount_value: discountValue,
                service_charge: serviceCharge,
                items: cart.map((l) => ({
                    product_id: l.product_id,
                    variant_id: l.variant_id,
                    quantity: l.quantity,
                    discount_amount: l.discount_amount,
                    notes: l.notes,
                    modifiers: l.modifiers.map((m) => ({ option_id: m.option_id, quantity: m.quantity })),
                })),
            },
            {
                onSuccess: () => {
                    playSound('success');
                    setCart([]);
                    setOrderNotes('');
                },
                onError: (errors) => {
                    playSound('alert');
                    setError(Object.values(errors)[0] ?? 'Could not park the order.');
                },
            },
        );
    };

    if (!branch) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center text-gray-600">
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-card max-w-md w-full">
                    <Icon name="store" className="mx-auto h-12 w-12 text-gray-400" />
                    <h2 className="mt-4 text-lg font-bold text-gray-900">No Branch Selected</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Please assign or select an accessible restaurant branch to launch the POS terminal.
                    </p>
                    <Link
                        href={route('dashboard')}
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-restrly-600 px-4 py-2.5 text-sm font-semibold text-white shadow-subtle hover:bg-restrly-700"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-100 font-sans select-none">
            <Head title={`POS Terminal · ${branch.name}`} />

            {/* --- TOP BAR --- */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 md:px-4 shadow-subtle z-20">
                {/* Left: Brand + Branch + Shift Status */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <Link
                        href={route('dashboard')}
                        title="Back to Admin Dashboard"
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition mr-1"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-restrly-600 text-white font-bold text-sm shadow-subtle">
                            R
                        </div>
                        <span className="hidden sm:inline font-bold tracking-tight text-gray-900 text-sm">
                            POS
                        </span>
                    </Link>

                    {/* Branch Switcher */}
                    <div className="relative">
                        <select
                            aria-label="Branch selector"
                            className="h-8 rounded-lg border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-8 text-xs font-semibold text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500 cursor-pointer"
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
                    </div>

                    {/* Shift Status Badge / Trigger */}
                    {shift ? (
                        <button
                            type="button"
                            onClick={() => setShowShift(true)}
                            className="group flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-subtle"
                            title="Click to view drawer balance & cash movements"
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Shift #{shift.id}</span>
                            <span className="hidden md:inline font-normal text-emerald-700">· {shift.opened_by}</span>
                            <span className="hidden lg:inline font-mono font-medium text-emerald-900 ml-1">
                                ({money(shift.expected_cash, currency)})
                            </span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowShift(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition animate-pulse shadow-subtle"
                        >
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span>{t('pos.no_shift')} · Open Shift</span>
                        </button>
                    )}
                </div>

                {/* Center / Right: Quick Actions & Live Info */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Parked / Held Orders Drawer Button */}
                    <button
                        type="button"
                        onClick={() => setShowHeldOrders(true)}
                        className="relative flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-subtle hover:bg-gray-50 transition"
                        title="View held/open table orders"
                    >
                        <Icon name="clock" className="h-3.5 w-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Held Orders</span>
                        {openOrders.length > 0 && (
                            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                {openOrders.length}
                            </span>
                        )}
                    </button>

                    {/* Live KDS Link */}
                    <Link
                        href={route('kitchen.index')}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-subtle hover:bg-gray-50 hover:text-amber-600 transition"
                        title="Open Kitchen Display System"
                    >
                        <Icon name="fire" className="h-3.5 w-3.5 text-amber-500" />
                        <span className="hidden md:inline">Kitchen</span>
                    </Link>

                    {/* Orders History Link */}
                    <Link
                        href={route('orders.index')}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-subtle hover:bg-gray-50 transition"
                        title="View past sales and receipts"
                    >
                        <Icon name="receipt" className="h-3.5 w-3.5 text-gray-500" />
                        <span className="hidden md:inline">{t('pos.orders_link')}</span>
                    </Link>

                    {/* Drawer / Cash Shift Button */}
                    <button
                        type="button"
                        onClick={() => setShowShift(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-subtle hover:bg-gray-50 transition"
                    >
                        <Icon name="wallet" className="h-3.5 w-3.5 text-gray-500" />
                        <span className="hidden lg:inline">{shift ? 'Drawer / Movements' : 'Shift'}</span>
                    </button>

                    {/* Audio Feedback Toggle */}
                    <button
                        type="button"
                        onClick={() => setSoundEnabled((prev) => !prev)}
                        className={`rounded-lg border border-gray-200 p-1.5 text-xs transition shadow-subtle ${
                            soundEnabled ? 'bg-restrly-50 text-restrly-700' : 'bg-gray-50 text-gray-400'
                        }`}
                        title={soundEnabled ? 'Audio cues enabled' : 'Audio cues muted'}
                    >
                        <span className="text-xs">{soundEnabled ? '🔊' : '🔇'}</span>
                    </button>

                    {/* Keyboard Shortcuts Trigger */}
                    <button
                        type="button"
                        onClick={() => setShowShortcuts(true)}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 shadow-subtle hover:bg-gray-100 transition"
                        title="Keyboard Shortcuts (?)"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* Banner Notifications */}
            {(flash?.success || flash?.error || error) && (
                <div
                    className={`flex items-center justify-between px-4 py-2 text-xs font-medium border-b shadow-subtle transition ${
                        error || flash?.error
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Icon
                            name={error || flash?.error ? 'alert' : 'receipt'}
                            className="h-4 w-4 shrink-0"
                        />
                        <span>{error ?? flash?.error ?? flash?.success}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-xs hover:opacity-75"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* --- MAIN WORKSPACE --- */}
            <div className="flex flex-1 overflow-hidden">
                {/* 1. Category Sidebar */}
                <aside className="w-48 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white p-2 hidden sm:flex">
                    <div className="mb-2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Categories
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            playSound('tap');
                            setActiveCategory('all');
                        }}
                        className={`mb-1.5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                            activeCategory === 'all'
                                ? 'bg-restrly-600 text-white shadow-subtle'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Icon name="grid" className="h-4 w-4" />
                            <span>All items</span>
                        </div>
                        <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                activeCategory === 'all'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            {products.length}
                        </span>
                    </button>

                    {categories.map((c) => {
                        const count = c.products_count ?? products.filter((p) => p.category_id === c.id).length;
                        const active = activeCategory === c.id;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                    playSound('tap');
                                    setActiveCategory(c.id);
                                }}
                                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                                    active
                                        ? 'bg-restrly-600 text-white shadow-subtle'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span className="truncate">{c.name}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                {/* 2. Middle Product Catalog Workspace */}
                <main className="flex flex-1 flex-col overflow-hidden bg-gray-50">
                    {/* Search & Category Pills (on small screens) */}
                    <div className="border-b border-gray-200 bg-white p-2.5 shadow-subtle">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Icon
                                    name="search"
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder={`${t('pos.search')} or scan barcode...  (F2)`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-xs sm:text-sm text-gray-900 shadow-subtle placeholder:text-gray-400 focus:border-restrly-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-restrly-500"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Small-screen category selector */}
                            <div className="sm:hidden">
                                <select
                                    aria-label="Filter category"
                                    value={activeCategory}
                                    onChange={(e) =>
                                        setActiveCategory(
                                            e.target.value === 'all' ? 'all' : Number(e.target.value),
                                        )
                                    }
                                    className="h-9 rounded-xl border border-gray-200 bg-gray-50 px-2 text-xs font-semibold text-gray-800"
                                >
                                    <option value="all">All items ({products.length})</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto p-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filtered.map((product) => {
                            const unitPrice = priceFor(product);
                            const inCartCount = cart
                                .filter((l) => l.product_id === product.id)
                                .reduce((acc, l) => acc + l.quantity, 0);

                            return (
                                <div
                                    key={product.id}
                                    className={`group relative flex flex-col justify-between rounded-2xl border p-3 bg-white shadow-subtle transition-all duration-150 ${
                                        product.is_available
                                            ? 'border-gray-200 hover:border-restrly-300 hover:shadow-card cursor-pointer'
                                            : 'border-gray-100 bg-gray-50/70 opacity-60'
                                    }`}
                                >
                                    {/* In-cart count badge */}
                                    {inCartCount > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-restrly-600 px-1 text-[10px] font-bold text-white shadow-subtle">
                                            ×{inCartCount}
                                        </div>
                                    )}

                                    {/* Product main tap area */}
                                    <button
                                        type="button"
                                        disabled={!product.is_available}
                                        onClick={() => addOrConfigure(product, null)}
                                        className="flex flex-1 flex-col text-left focus:outline-none"
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                                                {product.sku || 'Item'}
                                            </span>
                                            {!product.is_available && (
                                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                                                    Sold Out
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-restrly-700 transition">
                                            {product.name}
                                        </div>

                                        <div className="mt-2 font-mono text-sm font-bold text-gray-900 tracking-tight">
                                            {money(unitPrice, currency)}
                                        </div>
                                    </button>

                                    {/* Variant buttons */}
                                    {product.variants.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                                            {product.variants.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    disabled={!product.is_available}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addOrConfigure(product, v);
                                                    }}
                                                    className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-restrly-100 hover:text-restrly-800 transition disabled:opacity-50"
                                                >
                                                    {v.name}
                                                    {v.price !== null && (
                                                        <span className="ml-1 font-mono text-gray-500">
                                                            {money(v.price, currency)}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filtered.length === 0 && (
                            <div className="col-span-full py-16 text-center">
                                <Icon name="search" className="mx-auto h-8 w-8 text-gray-300" />
                                <p className="mt-2 text-sm font-medium text-gray-600">
                                    {t('pos.no_products')}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Try searching with a different term or clear the filter.
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                {/* 3. Right Cart & Checkout Panel */}
                <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white shadow-card z-10">
                    {/* Order Context & Header */}
                    <div className="border-b border-gray-200 p-3 bg-gray-50/50">
                        {/* Order Type Tabs */}
                        <div className="grid grid-cols-4 gap-1 rounded-xl bg-gray-200/80 p-1">
                            {ORDER_TYPES.map((type) => {
                                const active = orderType === type.value;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => {
                                            playSound('tap');
                                            setOrderType(type.value);
                                        }}
                                        className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition ${
                                            active
                                                ? 'bg-white text-restrly-800 shadow-subtle'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Icon name={type.icon} className="h-3.5 w-3.5 mb-0.5" />
                                        <span>{t(type.key)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Dine-In Controls */}
                        {orderType === 'dine_in' && (
                            <div className="mt-2.5 grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <select
                                        aria-label="Table selection"
                                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 text-xs font-medium text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                        value={tableId}
                                        onChange={(e) =>
                                            setTableId(e.target.value ? Number(e.target.value) : '')
                                        }
                                    >
                                        <option value="">{t('pos.no_table')}</option>
                                        {tables.map((tbl) => (
                                            <option key={tbl.id} value={tbl.id}>
                                                {tbl.name} ({tbl.seats} seats · {tbl.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        placeholder="Covers"
                                        title="Guest Covers count"
                                        value={covers}
                                        onChange={(e) => setCovers(Math.max(1, Number(e.target.value)))}
                                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 text-xs font-semibold text-gray-800 shadow-subtle text-center"
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1.5 text-[10px] text-gray-400">
                                        pax
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Takeaway / Counter Controls */}
                        {(orderType === 'takeaway' || orderType === 'counter') && (
                            <div className="mt-2.5">
                                <input
                                    type="text"
                                    placeholder={t('pos.customer') + ' (Optional name)'}
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-800 shadow-subtle"
                                />
                            </div>
                        )}

                        {/* Delivery Controls */}
                        {orderType === 'delivery' && (
                            <div className="mt-2.5 space-y-1.5">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Customer Name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs"
                                    />
                                    <select
                                        aria-label="Delivery Zone"
                                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs"
                                        value={deliveryZoneId}
                                        onChange={(e) =>
                                            setDeliveryZoneId(e.target.value ? Number(e.target.value) : '')
                                        }
                                    >
                                        <option value="">Zone (No fee)</option>
                                        {deliveryZones.map((z) => (
                                            <option key={z.id} value={z.id}>
                                                {z.name} (+{money(z.fee, currency)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Delivery street address"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs"
                                />
                                <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Driver Name"
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Driver Phone"
                                        value={driverPhone}
                                        onChange={(e) => setDriverPhone(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cart Lines List */}
                    <div className="flex-1 overflow-y-auto p-3 divide-y divide-gray-100">
                        {cart.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center py-12 text-center text-gray-400">
                                <Icon name="cart" className="h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-600">{t('pos.cart_empty')}</p>
                                <p className="mt-1 text-xs text-gray-400 max-w-[200px]">
                                    Tap items from the menu or scan a barcode to build this sale.
                                </p>
                            </div>
                        ) : (
                            cart.map((line) => {
                                const lineTotal = line.unit_price * line.quantity - line.discount_amount;
                                return (
                                    <div key={line.key} className="py-2.5 first:pt-0 last:pb-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="text-xs font-semibold text-gray-900 leading-tight">
                                                    {line.name}
                                                </div>
                                                {line.modifiers.length > 0 && (
                                                    <div className="mt-0.5 text-[10px] text-gray-500">
                                                        {line.modifiers.map((m) => m.name).join(', ')}
                                                    </div>
                                                )}
                                                <div className="mt-0.5 font-mono text-[11px] text-gray-500">
                                                    {money(line.unit_price, currency)} each
                                                </div>
                                            </div>

                                            {/* Line Total */}
                                            <div className="text-right">
                                                <div className="font-mono text-xs font-bold text-gray-900 tracking-tight">
                                                    {money(lineTotal, currency)}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(line.key)}
                                                    className="mt-0.5 text-[10px] text-red-500 hover:text-red-700 transition"
                                                    title="Remove item"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>

                                        {/* Stepper + Item Note Button */}
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 shadow-subtle">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(line.key, -1)}
                                                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-subtle"
                                                    title="Decrease quantity"
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={line.quantity}
                                                    onChange={(e) =>
                                                        setDirectQty(line.key, Number(e.target.value))
                                                    }
                                                    className="w-9 border-none bg-transparent p-0 text-center font-mono text-xs font-bold text-gray-900 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(line.key, 1)}
                                                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-subtle"
                                                    title="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Modifier / Note button */}
                                            <button
                                                type="button"
                                                onClick={() => openNoteModal(line)}
                                                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                                                    line.notes
                                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                        : 'text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon name="tag" className="h-3 w-3" />
                                                <span>{line.notes ? 'Edit Note' : '+ Note'}</span>
                                            </button>
                                        </div>

                                        {/* Active Kitchen Note display */}
                                        {line.notes && (
                                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 rounded-md px-2 py-0.5 border border-amber-100">
                                                <span>Kitchen Note:</span>
                                                <span className="italic font-normal">{line.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Financial Summary & Pay Action Panel */}
                    <div className="border-t border-gray-200 bg-gray-50/70 p-3">
                        {/* Discount Selector & Preset Chips */}
                        <div className="mb-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <select
                                    aria-label="Discount Type"
                                    className="rounded-lg border border-gray-300 bg-white py-1 px-2 text-xs font-medium text-gray-700 shadow-subtle"
                                    value={discountType}
                                    onChange={(e) => {
                                        setDiscountType(e.target.value as 'none' | 'amount' | 'percent');
                                        if (e.target.value === 'none') setDiscountValue(0);
                                    }}
                                >
                                    <option value="none">No Discount</option>
                                    <option value="percent">Discount (%)</option>
                                    <option value="amount">Discount ({currency})</option>
                                </select>

                                {discountType !== 'none' && (
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                                        className="w-20 rounded-lg border border-gray-300 bg-white py-1 px-2 text-xs font-mono font-bold text-gray-900 shadow-subtle"
                                    />
                                )}
                            </div>

                            {/* Preset chips for % discounts */}
                            {discountType === 'percent' && (
                                <div className="flex gap-1">
                                    {[5, 10, 15, 20].map((pct) => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => setDiscountValue(pct)}
                                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                                                discountValue === pct
                                                    ? 'bg-restrly-600 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Service Charge Toggle */}
                        {serviceChargeRate > 0 && (
                            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={serviceCharge}
                                    onChange={(e) => setServiceCharge(e.target.checked)}
                                    className="rounded border-gray-300 text-restrly-600 focus:ring-restrly-500"
                                />
                                <span>Service charge ({serviceChargeRate}%)</span>
                            </label>
                        )}

                        {/* Totals Breakdown */}
                        <dl className="space-y-1 text-xs">
                            <div className="flex justify-between text-gray-600">
                                <dt>Subtotal</dt>
                                <dd className="font-mono font-medium">{money(totals.subtotal, currency)}</dd>
                            </div>
                            {totals.discount > 0 && (
                                <div className="flex justify-between text-red-600 font-semibold">
                                    <dt>Discount</dt>
                                    <dd className="font-mono">−{money(totals.discount, currency)}</dd>
                                </div>
                            )}
                            {totals.deliveryFee > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <dt>Delivery Fee</dt>
                                    <dd className="font-mono">{money(totals.deliveryFee, currency)}</dd>
                                </div>
                            )}
                            {totals.tax > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <dt>Tax {taxInclusive ? '(Included)' : `(${taxRate}%)`}</dt>
                                    <dd className="font-mono">{money(totals.tax, currency)}</dd>
                                </div>
                            )}
                            {totals.serviceCharge > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <dt>Service</dt>
                                    <dd className="font-mono">{money(totals.serviceCharge, currency)}</dd>
                                </div>
                            )}

                            {/* Total Due Display */}
                            <div className="flex items-baseline justify-between border-t border-gray-200 pt-1.5">
                                <dt className="text-sm font-bold text-gray-900">Total Due</dt>
                                <dd className="font-mono text-xl font-bold tracking-tight text-gray-900">
                                    {money(totals.total, currency)}
                                </dd>
                            </div>
                        </dl>

                        {/* Primary Pay Button */}
                        <button
                            type="button"
                            disabled={cart.length === 0 || !shift}
                            onClick={() => {
                                playSound('tap');
                                setShowPayment(true);
                            }}
                            className="mt-3 flex w-full items-center justify-between rounded-xl bg-restrly-600 px-4 py-3 text-sm font-bold text-white shadow-card hover:bg-restrly-700 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <span>{t('pos.pay')} (F4)</span>
                            <span className="font-mono tracking-tight">{money(totals.total, currency)}</span>
                        </button>

                        {/* Dine-In Park / Open Order Button */}
                        {orderType === 'dine_in' && (
                            <button
                                type="button"
                                disabled={cart.length === 0 || !shift}
                                onClick={handleHoldOrder}
                                className="mt-2 w-full rounded-xl border border-amber-300 bg-amber-50 py-2 text-xs font-bold text-amber-800 shadow-subtle hover:bg-amber-100 transition disabled:opacity-50"
                                title="Send to kitchen without taking payment now"
                            >
                                Park / Kitchen Ticket (F8)
                            </button>
                        )}

                        {/* Clear Cart Button */}
                        {cart.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Clear all items from this cart?')) {
                                        playSound('tap');
                                        setCart([]);
                                    }
                                }}
                                className="mt-1.5 w-full py-1 text-center text-[11px] font-semibold text-gray-400 hover:text-red-600 transition"
                            >
                                {t('pos.clear_cart')}
                            </button>
                        )}
                    </div>
                </aside>
            </div>

            {/* --- MODAL 1: PAYMENT & CHECKOUT (Split & Cash) --- */}
            {showPayment && (
                <PaymentModal
                    currency={currency}
                    total={totals.total}
                    paymentMethods={paymentMethods}
                    managerPin={managerPin}
                    setManagerPin={setManagerPin}
                    onClose={() => setShowPayment(false)}
                    onError={setError}
                    playSound={playSound}
                    buildPayload={() => ({
                        branch_id: branch.id,
                        shift_id: shift?.id,
                        order_type: orderType,
                        table_id: tableId || null,
                        covers: orderType === 'dine_in' ? covers : null,
                        customer_name: customerName || null,
                        customer_id: customerId || null,
                        delivery_zone_id: orderType === 'delivery' && deliveryZoneId ? deliveryZoneId : null,
                        delivery_address: orderType === 'delivery' ? deliveryAddress || null : null,
                        driver_name: orderType === 'delivery' ? driverName || null : null,
                        driver_phone: orderType === 'delivery' ? driverPhone || null : null,
                        notes: orderNotes || null,
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
                            modifiers: l.modifiers.map((m) => ({ option_id: m.option_id, quantity: m.quantity })),
                        })),
                    })}
                />
            )}

            {/* --- MODAL: CONFIGURE MODIFIERS --- */}
            {configuring && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
                    <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-elevated sm:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{configuring.product.name}</h3>
                                <p className="text-xs text-gray-500">
                                    {configuring.variant ? configuring.variant.name : 'Base'}
                                    {configureDelta > 0 && (
                                        <span className="ml-1 font-mono text-gray-700">
                                            ({money(configuring.variant?.price ?? priceFor(configuring.product) + configureDelta, currency)})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfiguring(null)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                            {(configuring.product.modifier_groups ?? []).map((group) => {
                                const selected = selectedModifiers[group.id] ?? [];
                                return (
                                    <div key={group.id}>
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-700">{group.name}</span>
                                            {group.is_required && (
                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                                    Required
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400">
                                                {group.selection_type === 'single'
                                                    ? 'Choose one'
                                                    : `Choose up to ${group.max_select}`}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.options.map((option) => {
                                                const active = selected.includes(option.id);
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => toggleModifier(group, option.id)}
                                                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                                            active
                                                                ? 'border-restrly-500 bg-restrly-50 text-restrly-800'
                                                                : 'border-gray-200 bg-white text-gray-700 hover:border-restrly-300'
                                                        }`}
                                                    >
                                                        {option.name}
                                                        {option.price_delta !== 0 && (
                                                            <span className="ml-1 font-mono text-[10px] text-gray-500">
                                                                +{money(option.price_delta, currency)}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
                            <button
                                type="button"
                                onClick={() => setConfiguring(null)}
                                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!configureValid}
                                onClick={confirmConfigure}
                                className="rounded-xl bg-restrly-600 px-4 py-2 text-sm font-bold text-white shadow-card hover:bg-restrly-700 disabled:opacity-50"
                            >
                                Add to order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: SHIFT & CASH DRAWER --- */}
            {showShift && (
                <ShiftModal
                    branchId={branch.id}
                    shift={shift}
                    currency={currency}
                    onClose={() => setShowShift(false)}
                    playSound={playSound}
                />
            )}

            {/* --- MODAL 3: HELD / PARKED ORDERS SLIDEOVER --- */}
            {showHeldOrders && (
                <HeldOrdersDrawer
                    openOrders={openOrders}
                    currency={currency}
                    onClose={() => setShowHeldOrders(false)}
                />
            )}

            {/* --- MODAL 4: ITEM NOTE EDITOR --- */}
            {editingNoteKey && (
                <ItemNoteModal
                    initialNote={itemNoteInput}
                    onChangeNote={setItemNoteInput}
                    onSave={saveItemNote}
                    onClose={() => {
                        setEditingNoteKey(null);
                        setItemNoteInput('');
                    }}
                />
            )}

            {/* --- MODAL 5: KEYBOARD SHORTCUTS CHEATSHEET --- */}
            {showShortcuts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-elevated">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900">POS Keyboard Shortcuts</h3>
                            <button
                                type="button"
                                onClick={() => setShowShortcuts(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <dl className="mt-3 divide-y divide-gray-100 text-xs">
                            <div className="flex justify-between py-2">
                                <dt className="text-gray-600">Search Products</dt>
                                <dd className="font-mono font-bold text-gray-900">F2</dd>
                            </div>
                            <div className="flex justify-between py-2">
                                <dt className="text-gray-600">Pay / Checkout</dt>
                                <dd className="font-mono font-bold text-gray-900">F4</dd>
                            </div>
                            <div className="flex justify-between py-2">
                                <dt className="text-gray-600">Park / Send to Kitchen</dt>
                                <dd className="font-mono font-bold text-gray-900">F8</dd>
                            </div>
                            <div className="flex justify-between py-2">
                                <dt className="text-gray-600">Close Dialog / Clear</dt>
                                <dd className="font-mono font-bold text-gray-900">Esc</dd>
                            </div>
                            <div className="flex justify-between py-2">
                                <dt className="text-gray-600">Complete Payment</dt>
                                <dd className="font-mono font-bold text-gray-900">Enter</dd>
                            </div>
                        </dl>
                        <button
                            type="button"
                            onClick={() => setShowShortcuts(false)}
                            className="mt-4 w-full rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

/**
 * Payment Modal: Supports single & split payments, quick cash denomination chips, and change calculation.
 */
function PaymentModal({
    currency,
    total,
    paymentMethods,
    managerPin,
    setManagerPin,
    onClose,
    onError,
    playSound,
    buildPayload,
}: {
    currency: string;
    total: number;
    paymentMethods: PaymentMethod[];
    managerPin: string;
    setManagerPin: (v: string) => void;
    onClose: () => void;
    onError: (v: string | null) => void;
    playSound: (kind: 'tap' | 'add' | 'success' | 'alert') => void;
    buildPayload: () => Record<string, unknown>;
}) {
    const [isSplit, setIsSplit] = useState(false);
    const [singleMethodId, setSingleMethodId] = useState<number>(paymentMethods[0]?.id ?? 1);
    const [singleTendered, setSingleTendered] = useState<number>(total);

    // Split payments state
    const [splitPayments, setSplitPayments] = useState<{ method_id: number; amount: number; tendered?: number }[]>([
        { method_id: paymentMethods[0]?.id ?? 1, amount: total },
    ]);

    const form = useForm({});

    const selectedSingleMethod = paymentMethods.find((m) => m.id === singleMethodId);
    const isSingleCash = selectedSingleMethod?.type === 'cash';
    const singleChange = isSingleCash ? Math.max(0, singleTendered - total) : 0;

    // Quick cash denomination presets
    const cashPresets = useMemo(() => {
        const rounded5 = Math.ceil(total / 5) * 5;
        const rounded10 = Math.ceil(total / 10) * 10;
        const rounded50 = Math.ceil(total / 50) * 50;
        const rounded100 = Math.ceil(total / 100) * 100;
        const set = new Set([total, rounded5, rounded10, rounded50, rounded100].filter((v) => v >= total));
        return Array.from(set).slice(0, 4);
    }, [total]);

    // Split total validation
    const splitSum = splitPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const remainingToSplit = Math.round((total - splitSum) * 100) / 100;

    const handleAddSplitRow = () => {
        playSound('tap');
        const nextMethod = paymentMethods.find((m) => !splitPayments.some((p) => p.method_id === m.id)) ?? paymentMethods[0];
        setSplitPayments((prev) => [
            ...prev,
            { method_id: nextMethod.id, amount: Math.max(0, remainingToSplit) },
        ]);
    };

    const handleRemoveSplitRow = (index: number) => {
        playSound('tap');
        setSplitPayments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateSplitAmount = (index: number, amount: number) => {
        setSplitPayments((prev) =>
            prev.map((row, i) => (i === index ? { ...row, amount } : row)),
        );
    };

    const handleUpdateSplitMethod = (index: number, methodId: number) => {
        setSplitPayments((prev) =>
            prev.map((row, i) => (i === index ? { ...row, method_id: methodId } : row)),
        );
    };

    const submit = () => {
        onError(null);

        let paymentsPayload: { payment_method_id: number; amount: number; tendered?: number | null }[] = [];

        if (isSplit) {
            if (Math.abs(remainingToSplit) > 0.01) {
                onError(`Split payments must equal the total (${money(total, currency)}). Remaining: ${money(remainingToSplit, currency)}`);
                playSound('alert');
                return;
            }
            paymentsPayload = splitPayments.map((p) => {
                const method = paymentMethods.find((m) => m.id === p.method_id);
                return {
                    payment_method_id: p.method_id,
                    amount: p.amount,
                    tendered: method?.type === 'cash' ? p.amount : null,
                };
            });
        } else {
            paymentsPayload = [
                {
                    payment_method_id: singleMethodId,
                    amount: total,
                    tendered: isSingleCash ? singleTendered : null,
                },
            ];
        }

        const payload = {
            ...buildPayload(),
            payments: paymentsPayload,
            idempotency_key: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        };

        form.transform(() => payload);

        form.post(route('pos.orders.store'), {
            onSuccess: () => {
                playSound('success');
                onClose();
            },
            onError: (errors: Record<string, string>) => {
                playSound('alert');
                onError(Object.values(errors)[0] ?? 'Could not complete the sale.');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-elevated border border-gray-100 flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-base font-bold text-gray-900">Payment &amp; Checkout</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Big Amount Due Hero */}
                <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Total Due
                    </div>
                    <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-gray-900">
                        {money(total, currency)}
                    </div>
                </div>

                {/* Single vs Split Payment Toggle */}
                <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => setIsSplit(false)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                            !isSplit ? 'bg-white text-gray-900 shadow-subtle' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Single Payment
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSplit(true);
                            if (splitPayments.length <= 1) {
                                setSplitPayments([
                                    { method_id: paymentMethods[0]?.id ?? 1, amount: Math.round((total / 2) * 100) / 100 },
                                    { method_id: paymentMethods[1]?.id ?? paymentMethods[0]?.id ?? 1, amount: Math.round((total - Math.round((total / 2) * 100) / 100) * 100) / 100 },
                                ]);
                            }
                        }}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                            isSplit ? 'bg-white text-gray-900 shadow-subtle' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Split Payment
                    </button>
                </div>

                {/* SINGLE PAYMENT MODE */}
                {!isSplit && (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                                Payment Method
                            </label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {paymentMethods.map((m) => {
                                    const active = singleMethodId === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                                playSound('tap');
                                                setSingleMethodId(m.id);
                                            }}
                                            className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-bold transition ${
                                                active
                                                    ? 'border-restrly-600 bg-restrly-50 text-restrly-900 ring-2 ring-restrly-500/20'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon
                                                name={m.type === 'cash' ? 'wallet' : 'credit-card'}
                                                className={`h-5 w-5 mb-1 ${active ? 'text-restrly-600' : 'text-gray-400'}`}
                                            />
                                            <span>{m.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cash received & change calculation */}
                        {isSingleCash && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                                        Cash Received
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-gray-400">
                                            {currency}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={total}
                                            value={singleTendered}
                                            onChange={(e) => setSingleTendered(Number(e.target.value))}
                                            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-8 pr-3 font-mono text-lg font-bold text-gray-900 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                        />
                                    </div>
                                </div>

                                {/* Quick Cash Denomination Chips */}
                                <div>
                                    <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                                        Quick Denominations
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cashPresets.map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => {
                                                    playSound('tap');
                                                    setSingleTendered(amt);
                                                }}
                                                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition ${
                                                    singleTendered === amt
                                                        ? 'bg-restrly-600 text-white'
                                                        : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100'
                                                }`}
                                            >
                                                {amt === total ? 'Exact ' : ''}
                                                {money(amt, currency)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Change Due Highlight */}
                                <div className="flex items-baseline justify-between border-t border-gray-200 pt-2 text-emerald-800">
                                    <span className="text-xs font-bold">Change Due</span>
                                    <span className="font-mono text-xl font-extrabold tracking-tight">
                                        {money(singleChange, currency)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SPLIT PAYMENT MODE */}
                {isSplit && (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-700">
                                Split Across Payment Methods
                            </label>
                            <button
                                type="button"
                                onClick={handleAddSplitRow}
                                className="text-xs font-bold text-restrly-600 hover:text-restrly-800"
                            >
                                + Add Method
                            </button>
                        </div>

                        <div className="space-y-2">
                            {splitPayments.map((row, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <select
                                        aria-label="Payment Method"
                                        className="flex-1 rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs font-semibold text-gray-800"
                                        value={row.method_id}
                                        onChange={(e) => handleUpdateSplitMethod(index, Number(e.target.value))}
                                    >
                                        {paymentMethods.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="relative w-32">
                                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">
                                            {currency}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={row.amount}
                                            onChange={(e) =>
                                                handleUpdateSplitAmount(index, Number(e.target.value))
                                            }
                                            className="w-full rounded-xl border border-gray-300 bg-white py-1.5 pl-6 pr-2 text-right font-mono text-xs font-bold text-gray-900"
                                        />
                                    </div>
                                    {splitPayments.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSplitRow(index)}
                                            className="text-xs text-red-500 hover:text-red-700 p-1"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Split Balance Summary */}
                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-1 text-xs">
                            <div className="flex justify-between text-gray-600">
                                <span>Split Total</span>
                                <span className="font-mono font-bold">{money(splitSum, currency)}</span>
                            </div>
                            <div className={`flex justify-between font-bold ${remainingToSplit === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                <span>Remaining to cover</span>
                                <span className="font-mono">{money(remainingToSplit, currency)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manager PIN for approvals if needed */}
                <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                        Manager PIN (Required for high discounts)
                    </label>
                    <input
                        type="password"
                        placeholder="Enter PIN if prompted"
                        value={managerPin}
                        onChange={(e) => setManagerPin(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-3 text-xs tracking-widest text-gray-900"
                    />
                </div>

                {/* Modal Footer Actions */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={form.processing || (isSplit && Math.abs(remainingToSplit) > 0.01)}
                        className="rounded-xl bg-restrly-600 px-5 py-2 text-xs font-bold text-white shadow-card hover:bg-restrly-700 active:scale-[0.99] transition disabled:opacity-50"
                    >
                        {form.processing ? 'Processing...' : 'Complete Sale (Enter)'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Shift & Drawer Modal: Open float, cash in / cash out movements, expected vs counted reconciliation.
 */
function ShiftModal({
    branchId,
    shift,
    currency,
    onClose,
    playSound,
}: {
    branchId: number;
    shift: ShiftInfo | null;
    currency: string;
    onClose: () => void;
    playSound: (kind: 'tap' | 'add' | 'success' | 'alert') => void;
}) {
    const openForm = useForm({ branch_id: branchId, opening_float: 100 });
    const closeForm = useForm({ counted_cash: shift?.expected_cash ?? 0, manager_pin: '', notes: '' });
    const cashForm = useForm({ direction: 'in', amount: 50, reason: '' });

    // Variance calculation on close
    const variance = (closeForm.data.counted_cash || 0) - (shift?.expected_cash || 0);

    // If shift is closed, show Open Shift view
    if (!shift) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-base font-bold text-gray-900">Open Cash Register Shift</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                        Enter the starting cash float present in the cash drawer to begin recording sales.
                    </p>

                    <div className="mt-4">
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                            Opening Float Amount
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-gray-400">
                                {currency}
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full rounded-xl border border-gray-300 py-2 pl-8 pr-3 font-mono text-base font-bold text-gray-900"
                                value={openForm.data.opening_float}
                                onChange={(e) => openForm.setData('opening_float', Number(e.target.value))}
                            />
                        </div>
                        {openForm.errors.opening_float && (
                            <p className="mt-1 text-xs text-red-600">{openForm.errors.opening_float}</p>
                        )}
                        {(openForm.errors as Record<string, string>).shift && (
                            <p className="mt-1 text-xs text-red-600">
                                {(openForm.errors as Record<string, string>).shift}
                            </p>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                playSound('tap');
                                openForm.post(route('shifts.open'), {
                                    onSuccess: () => {
                                        playSound('success');
                                        onClose();
                                    },
                                });
                            }}
                            disabled={openForm.processing}
                            className="rounded-xl bg-restrly-600 px-4 py-2 text-xs font-bold text-white shadow-card hover:bg-restrly-700 disabled:opacity-50"
                        >
                            Open Shift
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active Shift Management View
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Shift #{shift.id} &amp; Drawer</h3>
                        <p className="text-[11px] text-gray-500">
                            Cashier: {shift.opened_by}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Shift Summary Cards */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Opening Float</span>
                        <div className="mt-0.5 font-mono text-base font-bold text-gray-900">
                            {money(shift.opening_float, currency)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <span className="text-[10px] font-bold uppercase text-emerald-700">Expected Cash</span>
                        <div className="mt-0.5 font-mono text-base font-bold text-emerald-900">
                            {money(shift.expected_cash, currency)}
                        </div>
                    </div>
                </div>

                {/* Cash In / Cash Out Movements */}
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
                    <h4 className="text-xs font-bold text-gray-800 mb-2">Record Cash Movement</h4>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                aria-label="Direction"
                                className="rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs font-semibold text-gray-800"
                                value={cashForm.data.direction}
                                onChange={(e) => cashForm.setData('direction', e.target.value)}
                            >
                                <option value="in">Cash In (Float Top-up)</option>
                                <option value="out">Cash Out (Drop / Payout)</option>
                            </select>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                className="rounded-xl border border-gray-300 bg-white py-1.5 px-2 font-mono text-xs font-bold text-gray-900"
                                value={cashForm.data.amount}
                                onChange={(e) => cashForm.setData('amount', Number(e.target.value))}
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                placeholder="Reason (e.g. Petty cash, supplier drop)"
                                className="flex-1 rounded-xl border border-gray-300 bg-white py-1.5 px-2 text-xs"
                                value={cashForm.data.reason}
                                onChange={(e) => cashForm.setData('reason', e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    cashForm.post(route('shifts.movements.store', shift.id), {
                                        onSuccess: () => {
                                            playSound('success');
                                            cashForm.reset('reason');
                                        },
                                    })
                                }
                                disabled={cashForm.processing || !cashForm.data.amount}
                                className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black transition disabled:opacity-50"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>

                {/* Close & Reconcile Shift */}
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50/40 p-3.5">
                    <h4 className="text-xs font-bold text-red-900 mb-2">Close Shift &amp; Reconcile</h4>
                    <div className="space-y-2">
                        <div>
                            <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                Counted Cash in Drawer
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 font-mono text-sm font-bold text-gray-900"
                                value={closeForm.data.counted_cash}
                                onChange={(e) => closeForm.setData('counted_cash', Number(e.target.value))}
                            />
                        </div>

                        {/* Variance badge */}
                        <div className="flex justify-between items-center text-xs px-1">
                            <span className="text-gray-500">Calculated Variance:</span>
                            <span
                                className={`font-mono font-bold ${
                                    Math.abs(variance) < 0.01
                                        ? 'text-emerald-700'
                                        : variance > 0
                                          ? 'text-amber-700'
                                          : 'text-red-700'
                                }`}
                            >
                                {variance > 0 ? '+' : ''}
                                {money(variance, currency)}
                                {Math.abs(variance) < 0.01 ? ' (Balanced)' : variance > 0 ? ' (Overage)' : ' (Shortage)'}
                            </span>
                        </div>

                        <input
                            type="password"
                            placeholder="Manager PIN (required if variance exceeds threshold)"
                            className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 text-xs"
                            value={closeForm.data.manager_pin}
                            onChange={(e) => closeForm.setData('manager_pin', e.target.value)}
                        />

                        {Object.values(closeForm.errors)[0] && (
                            <p className="text-xs text-red-600 font-medium">
                                {Object.values(closeForm.errors)[0]}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Are you sure you want to close and reconcile this shift?')) {
                                    closeForm.post(route('shifts.close', shift.id), {
                                        onSuccess: () => {
                                            playSound('success');
                                            onClose();
                                        },
                                    });
                                }
                            }}
                            disabled={closeForm.processing}
                            className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-subtle hover:bg-red-700 transition disabled:opacity-50"
                        >
                            Close Register &amp; Reconcile Shift
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Slide-over drawer displaying held/parked orders for quick lookup and settlement.
 */
function HeldOrdersDrawer({
    openOrders,
    currency,
    onClose,
}: {
    openOrders: OpenOrderSummary[];
    currency: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white shadow-elevated flex flex-col h-full animate-slide-left">
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <div className="flex items-center gap-2">
                        <Icon name="clock" className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-gray-900">
                            Held &amp; Open Orders ({openOrders.length})
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
                    {openOrders.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <Icon name="clock" className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-600">No Held Orders</p>
                            <p className="mt-1 text-xs text-gray-400">
                                Open orders or dine-in table checks will appear here.
                            </p>
                        </div>
                    ) : (
                        openOrders.map((order) => (
                            <div key={order.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-gray-900">
                                            {order.order_number}
                                        </span>
                                        {order.table_name && (
                                            <Badge tone="brand">
                                                {order.table_name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {order.customer_name || 'Guest'} · {order.items_count} items · {order.placed_at}
                                    </div>
                                    <div className="mt-1 font-mono text-xs font-bold text-gray-900">
                                        {money(order.total, currency)}
                                    </div>
                                </div>

                                <Link
                                    href={route('orders.show', order.id)}
                                    className="rounded-xl border border-restrly-300 bg-restrly-50 px-3 py-1.5 text-xs font-bold text-restrly-700 hover:bg-restrly-100 transition shadow-subtle"
                                >
                                    View / Settle →
                                </Link>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl border border-gray-300 py-2 text-xs font-semibold text-gray-700 hover:bg-white"
                    >
                        Close Panel
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Item Note Modal: Custom kitchen preparation instructions.
 */
function ItemNoteModal({
    initialNote,
    onChangeNote,
    onSave,
    onClose,
}: {
    initialNote: string;
    onChangeNote: (v: string) => void;
    onSave: () => void;
    onClose: () => void;
}) {
    const quickPhrases = [
        'No onions',
        'Extra spicy',
        'Mild spicy',
        'Gluten-free',
        'Allergy: nuts',
        'Sauce on side',
        'Well done',
        'Pack separately',
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-elevated">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <h3 className="text-sm font-bold text-gray-900">Kitchen Preparation Note</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="mt-3">
                    <textarea
                        rows={2}
                        placeholder="e.g. Less oil, extra sauce on side, table allergy..."
                        value={initialNote}
                        onChange={(e) => onChangeNote(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 p-2 text-xs text-gray-900 focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                    />
                </div>

                {/* Quick phrase chips */}
                <div className="mt-2.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                        Quick Instructions
                    </span>
                    <div className="flex flex-wrap gap-1">
                        {quickPhrases.map((phrase) => (
                            <button
                                key={phrase}
                                type="button"
                                onClick={() => {
                                    onChangeNote(initialNote ? `${initialNote}, ${phrase}` : phrase);
                                }}
                                className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-200"
                            >
                                + {phrase}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="rounded-xl bg-restrly-600 px-4 py-1.5 text-xs font-bold text-white shadow-subtle hover:bg-restrly-700"
                    >
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    );
}
