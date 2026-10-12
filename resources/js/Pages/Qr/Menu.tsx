import QrLayout from '@/Layouts/QrLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

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

interface Variant {
    id: number;
    name: string;
    price: number;
}

interface MenuProduct {
    id: number;
    name: string;
    description: string | null;
    category_id: number | null;
    category_name: string | null;
    price: number;
    image_url: string | null;
    labels: string[];
    variants: Variant[];
    modifier_groups: ModifierGroup[];
}

interface Category {
    id: number;
    name: string;
    parent_id: number | null;
}

interface CartModifier {
    option_id: number;
    name: string;
    price_delta: number;
    quantity: number;
}

interface CartLine {
    key: string;
    product_id: number;
    variant_id: number | null;
    name: string;
    unit_price: number;
    quantity: number;
    notes: string | null;
    modifiers: CartModifier[];
}

interface MenuProps {
    token: string;
    restaurant: { name: string; branch: string; currency: string };
    table: { id: number; name: string };
    session: { id: number; status: string; billing_mode: string };
    policy: { allow_additional_orders: boolean; allow_notes: boolean };
    categories: Category[];
    products: MenuProduct[];
}

export default function QrMenu({ token, restaurant, table, policy, categories, products }: MenuProps) {
    const currency = restaurant.currency;
    const cartKey = `qr_cart_${token}`;
    const money = (n: number) => `${currency} ${Number(n || 0).toFixed(2)}`;

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
    const [cart, setCart] = useState<CartLine[]>([]);
    const [detail, setDetail] = useState<MenuProduct | null>(null);
    const [variantId, setVariantId] = useState<number | null>(null);
    const [selected, setSelected] = useState<Record<number, number[]>>({});
    const [detailQty, setDetailQty] = useState(1);
    const [detailNote, setDetailNote] = useState('');
    const [showCart, setShowCart] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placed, setPlaced] = useState<{ number: string; total: number } | null>(null);

    // Restore cart across refreshes.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(cartKey);
            if (raw) setCart(JSON.parse(raw));
        } catch {
            /* ignore */
        }
    }, [cartKey]);

    useEffect(() => {
        localStorage.setItem(cartKey, JSON.stringify(cart));
    }, [cart, cartKey]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return products.filter((p) => {
            const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory;
            const matchesTerm =
                term === '' ||
                p.name.toLowerCase().includes(term) ||
                (p.description ?? '').toLowerCase().includes(term);
            return matchesCategory && matchesTerm;
        });
    }, [products, activeCategory, search]);

    const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

    const detailBasePrice = detail
        ? (variantId ? detail.variants.find((v) => v.id === variantId)?.price ?? detail.price : detail.price)
        : 0;
    const detailDelta = detail
        ? detail.modifier_groups.reduce(
              (sum, g) => sum + g.options.filter((o) => (selected[g.id] ?? []).includes(o.id)).reduce((s, o) => s + o.price_delta, 0),
              0,
          )
        : 0;
    const detailValid = detail
        ? detail.modifier_groups.every((g) => {
              const count = (selected[g.id] ?? []).length;
              return count >= g.min_select && count <= g.max_select;
          })
        : true;

    const openDetail = (product: MenuProduct) => {
        setDetail(product);
        setVariantId(product.variants[0]?.id ?? null);
        setSelected({});
        setDetailQty(1);
        setDetailNote('');
    };

    const toggleModifier = (group: ModifierGroup, optionId: number) => {
        setSelected((prev) => {
            const current = prev[group.id] ?? [];
            if (group.selection_type === 'single') {
                return { ...prev, [group.id]: current.includes(optionId) ? [] : [optionId] };
            }
            if (current.includes(optionId)) return { ...prev, [group.id]: current.filter((i) => i !== optionId) };
            if (current.length >= group.max_select) return prev;
            return { ...prev, [group.id]: [...current, optionId] };
        });
    };

    const addToCart = () => {
        if (!detail || !detailValid) return;
        const variant = detail.variants.find((v) => v.id === variantId) ?? null;
        const modifiers: CartModifier[] = [];
        for (const group of detail.modifier_groups) {
            for (const optionId of selected[group.id] ?? []) {
                const option = group.options.find((o) => o.id === optionId);
                if (option) modifiers.push({ option_id: option.id, name: option.name, price_delta: option.price_delta, quantity: 1 });
            }
        }
        const signature = modifiers.map((m) => m.option_id).sort((a, b) => a - b).join('.');
        const key = `${detail.id}-${variant?.id ?? 'base'}${signature ? `-m${signature}` : ''}`;
        const delta = modifiers.reduce((s, m) => s + m.price_delta, 0);
        const unitPrice = Math.round(((variant?.price ?? detail.price) + delta) * 100) / 100;

        setCart((prev) => {
            const existing = prev.find((l) => l.key === key && (l.notes ?? '') === detailNote.trim());
            if (existing) {
                return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + detailQty } : l));
            }
            return [
                ...prev,
                {
                    key: `${key}-${detailNote.trim()}`,
                    product_id: detail.id,
                    variant_id: variant?.id ?? null,
                    name: variant ? `${detail.name} (${variant.name})` : detail.name,
                    unit_price: unitPrice,
                    quantity: detailQty,
                    notes: detailNote.trim() || null,
                    modifiers,
                },
            ];
        });
        setDetail(null);
        setShowCart(true);
    };

    const changeQty = (line: CartLine, delta: number) =>
        setCart((prev) => prev.map((l) => (l === line ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));

    const submitOrder = async () => {
        if (cart.length === 0) return;
        setSubmitting(true);
        setError(null);

        try {
            const { data } = await window.axios.post(
                route('qr.orders.store', { token }),
                {
                    idempotency_key: `qr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                    notes: orderNotes || null,
                    items: cart.map((l) => ({
                        product_id: l.product_id,
                        variant_id: l.variant_id,
                        quantity: l.quantity,
                        notes: l.notes,
                        modifiers: l.modifiers.map((m) => ({ option_id: m.option_id, quantity: m.quantity })),
                    })),
                },
                { headers: { 'X-Dining-Participant': localStorage.getItem('qr_participant_token') ?? '' } },
            );

            setPlaced({ number: data.order.number, total: data.order.total });
            setCart([]);
            setOrderNotes('');
            setShowCart(false);
            localStorage.removeItem(cartKey);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            const first = Object.values(err?.response?.data?.errors ?? {})[0];
            setError(err?.response?.data?.message ?? (Array.isArray(first) ? first[0] : undefined) ?? 'Could not place your order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <QrLayout
            restaurant={restaurant}
            tableName={table.name}
            headerRight={
                <button
                    type="button"
                    onClick={() => setShowCart(true)}
                    className="relative rounded-xl bg-restrly-600 px-3 py-2 text-xs font-bold text-white shadow-subtle"
                >
                    Cart
                    {cartCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                            {cartCount}
                        </span>
                    )}
                </button>
            }
        >
            <Head title={`${restaurant.name} · Menu`} />

            {placed && (
                <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
                    <p className="text-sm font-bold">Order {placed.number} received 🎉</p>
                    <p className="mt-1 text-xs">
                        Total {money(placed.total)}. The kitchen has been notified.
                        {policy.allow_additional_orders ? ' You can keep ordering from the menu.' : ''}
                    </p>
                    <a
                        href={route('qr.tracking', { token })}
                        className="mt-3 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                    >
                        Track your order
                    </a>
                </div>
            )}

            <div className="mb-3">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search the menu"
                    className="h-11 w-full rounded-xl border-gray-300 px-3 text-sm focus:border-restrly-500 focus:ring-restrly-500"
                />
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        activeCategory === 'all' ? 'bg-restrly-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'
                    }`}
                >
                    All
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            activeCategory === category.id ? 'bg-restrly-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'
                        }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {filtered.map((product) => (
                    <button
                        key={product.id}
                        type="button"
                        onClick={() => openDetail(product)}
                        className="overflow-hidden rounded-2xl bg-white text-left shadow-subtle transition hover:shadow-card"
                    >
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-28 w-full object-cover" loading="lazy" />
                        ) : (
                            <div className="flex h-28 w-full items-center justify-center bg-restrly-50 text-2xl">🍽️</div>
                        )}
                        <div className="p-3">
                            <p className="line-clamp-2 min-h-[2.25rem] text-sm font-semibold text-gray-900">{product.name}</p>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="font-mono text-sm font-bold text-gray-900">{money(product.price)}</span>
                                {product.labels.slice(0, 2).map((label) => (
                                    <span key={label} className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {filtered.length === 0 && (
                <p className="py-16 text-center text-sm text-gray-400">No items match your search.</p>
            )}

            {/* --- Item detail --- */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
                    <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">{detail.name}</h3>
                                {detail.description && <p className="mt-0.5 text-xs text-gray-500">{detail.description}</p>}
                            </div>
                            <button type="button" onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                            {detail.variants.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-xs font-semibold text-gray-700">Choose a size</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {detail.variants.map((variant) => (
                                            <button
                                                key={variant.id}
                                                type="button"
                                                onClick={() => setVariantId(variant.id)}
                                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                                                    variantId === variant.id ? 'border-restrly-500 bg-restrly-50 text-restrly-800' : 'border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                {variant.name} · {money(variant.price)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detail.modifier_groups.map((group) => {
                                const groupSelected = selected[group.id] ?? [];
                                return (
                                    <div key={group.id}>
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-700">{group.name}</span>
                                            {group.is_required && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Required</span>}
                                            <span className="text-[10px] text-gray-400">
                                                {group.selection_type === 'single' ? 'Choose one' : `Up to ${group.max_select}`}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.options.map((option) => {
                                                const active = groupSelected.includes(option.id);
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => toggleModifier(group, option.id)}
                                                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                                                            active ? 'border-restrly-500 bg-restrly-50 text-restrly-800' : 'border-gray-200 text-gray-700'
                                                        }`}
                                                    >
                                                        {option.name}
                                                        {option.price_delta !== 0 && <span className="ml-1 font-mono text-[10px] text-gray-500">+{money(option.price_delta)}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {policy.allow_notes && (
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-medium text-gray-600">Special instructions (optional)</span>
                                    <input
                                        value={detailNote}
                                        onChange={(e) => setDetailNote(e.target.value)}
                                        className="h-10 w-full rounded-xl border-gray-300 px-3 text-sm focus:border-restrly-500 focus:ring-restrly-500"
                                        placeholder="e.g. no onions"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-3">
                            <div className="flex items-center rounded-xl border border-gray-200">
                                <button type="button" className="px-3 py-2 text-lg text-gray-600" onClick={() => setDetailQty((q) => Math.max(1, q - 1))}>
                                    −
                                </button>
                                <span className="w-8 text-center text-sm font-bold">{detailQty}</span>
                                <button type="button" className="px-3 py-2 text-lg text-gray-600" onClick={() => setDetailQty((q) => q + 1)}>
                                    +
                                </button>
                            </div>
                            <button
                                type="button"
                                disabled={!detailValid}
                                onClick={addToCart}
                                className="h-11 flex-1 rounded-xl bg-restrly-600 text-sm font-bold text-white shadow-card hover:bg-restrly-700 disabled:opacity-50"
                            >
                                Add · {money((detailBasePrice + detailDelta) * detailQty)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Cart --- */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
                    <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                            <h3 className="text-base font-bold text-gray-900">Your order</h3>
                            <button type="button" onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {cart.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-400">Your cart is empty.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {cart.map((line) => (
                                        <li key={line.key} className="flex items-start justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{line.name}</p>
                                                {line.modifiers.length > 0 && (
                                                    <p className="text-[11px] text-gray-500">{line.modifiers.map((m) => m.name).join(', ')}</p>
                                                )}
                                                {line.notes && <p className="text-[11px] italic text-gray-400">{line.notes}</p>}
                                                <p className="mt-0.5 font-mono text-xs text-gray-500">{money(line.unit_price)}</p>
                                            </div>
                                            <div className="flex items-center rounded-lg border border-gray-200">
                                                <button type="button" className="px-2.5 py-1 text-gray-600" onClick={() => changeQty(line, -1)}>
                                                    −
                                                </button>
                                                <span className="w-7 text-center text-sm font-bold">{line.quantity}</span>
                                                <button type="button" className="px-2.5 py-1 text-gray-600" onClick={() => changeQty(line, 1)}>
                                                    +
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {policy.allow_notes && cart.length > 0 && (
                                <label className="mt-4 block">
                                    <span className="mb-1.5 block text-xs font-medium text-gray-600">Order note (optional)</span>
                                    <input
                                        value={orderNotes}
                                        onChange={(e) => setOrderNotes(e.target.value)}
                                        className="h-10 w-full rounded-xl border-gray-300 px-3 text-sm focus:border-restrly-500 focus:ring-restrly-500"
                                    />
                                </label>
                            )}

                            {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                        </div>

                        <div className="border-t border-gray-100 px-5 py-3">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-mono font-bold text-gray-900">{money(subtotal)}</span>
                            </div>
                            <p className="mb-3 text-[11px] text-gray-400">Taxes and service charges are confirmed by the restaurant on your bill.</p>
                            <button
                                type="button"
                                disabled={cart.length === 0 || submitting}
                                onClick={submitOrder}
                                className="h-12 w-full rounded-xl bg-restrly-600 text-sm font-bold text-white shadow-card hover:bg-restrly-700 disabled:opacity-50"
                            >
                                {submitting ? 'Placing order…' : 'Place order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </QrLayout>
    );
}
