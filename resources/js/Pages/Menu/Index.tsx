import Icon from '@/Components/Icon';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

// --- Interfaces ---

interface Category {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
    products_count: number;
}

interface Variant {
    id?: number;
    name: string;
    sku: string | null;
    price: number | null;
}

interface Product {
    id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    category_id: number | null;
    category_name: string | null;
    tax_category: string | null;
    price_dine_in: number;
    price_takeaway: number;
    price_delivery: number;
    cost_price: number;
    inventory_mode: string;
    is_active: boolean;
    is_available: boolean;
    labels: string[];
    sort_order: number;
    variants: Variant[];
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total?: number;
    from?: number;
    to?: number;
}

const money = (n: number) =>
    `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MenuIndex({
    categories,
    products,
    filters,
    inventoryModes,
}: {
    categories: Category[];
    products: Paginated<Product>;
    filters: { search: string; category_id: number | null };
    inventoryModes: { value: string; label: string }[];
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth?.permissions?.includes('menu.manage') ?? false;

    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>(
        filters.category_id ?? 'all',
    );
    const [editing, setEditing] = useState<Product | 'new' | null>(null);
    const [showCategoriesModal, setShowCategoriesModal] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

    const applyFilters = (overrides: Record<string, unknown> = {}) => {
        router.get(
            route('menu.index'),
            {
                search,
                category_id: selectedCategoryId === 'all' ? null : selectedCategoryId,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Quick Metrics
    const metrics = useMemo(() => {
        const total = products.total ?? products.data.length;
        const active = products.data.filter((p) => p.is_active).length;
        const available = products.data.filter((p) => p.is_available).length;
        const totalCategories = categories.length;
        return { total, active, available, totalCategories };
    }, [products, categories]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
                            Menu &amp; Products
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-gray-500">
                            Configure restaurant catalog, multi-channel pricing, variants, and stock tracking.
                        </p>
                    </div>

                    {canManage && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCategoriesModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 shadow-subtle hover:bg-gray-50 transition"
                            >
                                <Icon name="grid" className="h-4 w-4 text-gray-500" />
                                <span>Categories ({categories.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing('new')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-restrly-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-card hover:bg-restrly-700 active:scale-[0.99] transition"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                <span>New Product</span>
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <Head title="Menu & Products" />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Alerts */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 shadow-subtle">
                            <Icon name="receipt" className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Total Products
                            </span>
                            <div className="mt-1 font-mono text-2xl font-bold text-gray-900">
                                {metrics.total}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                                Active Items
                            </span>
                            <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
                                {metrics.active}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                                In Stock (Available)
                            </span>
                            <div className="mt-1 font-mono text-2xl font-bold text-amber-700">
                                {metrics.available}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Categories
                            </span>
                            <div className="mt-1 font-mono text-2xl font-bold text-gray-900">
                                {metrics.totalCategories}
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle space-y-3">
                        {/* Search Input & Category Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters();
                                }}
                                className="relative flex-1 max-w-md"
                            >
                                <Icon
                                    name="search"
                                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Search by name, SKU, or barcode..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-16 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-restrly-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-restrly-500 shadow-subtle"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black transition"
                                >
                                    Filter
                                </button>
                            </form>

                            {/* Category Selector Dropdown */}
                            <div className="w-full sm:w-auto">
                                <select
                                    aria-label="Filter category"
                                    value={selectedCategoryId}
                                    onChange={(e) => {
                                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                        setSelectedCategoryId(val);
                                        applyFilters({ category_id: val === 'all' ? null : val });
                                    }}
                                    className="w-full sm:w-56 rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs font-semibold text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                >
                                    <option value="all">All Categories ({products.total ?? products.data.length})</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.products_count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Category Quick Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCategoryId('all');
                                    applyFilters({ category_id: null });
                                }}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-subtle ${
                                    selectedCategoryId === 'all'
                                        ? 'bg-restrly-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All items
                            </button>
                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategoryId(c.id);
                                        applyFilters({ category_id: c.id });
                                    }}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-subtle whitespace-nowrap ${
                                        selectedCategoryId === c.id
                                            ? 'bg-restrly-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {c.name} ({c.products_count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Data Table */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-subtle overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50/50">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Product Catalog ({products.data.length} shown)
                            </span>
                        </div>

                        {products.data.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <Icon name="book" className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-700">No products found</p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Create your first menu item or change your category filter.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">Product Name</th>
                                            <th className="px-5 py-3">Category</th>
                                            <th className="px-5 py-3 text-right">Dine-In</th>
                                            <th className="px-5 py-3 text-right">Takeaway</th>
                                            <th className="px-5 py-3 text-right">Delivery</th>
                                            <th className="px-5 py-3 text-right">Cost Price</th>
                                            <th className="px-5 py-3">Stock Mode</th>
                                            <th className="px-5 py-3">Status</th>
                                            {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {products.data.map((product) => {
                                            return (
                                                <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                                                    {/* Product details */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-semibold text-gray-900">
                                                            {product.name}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400">
                                                            {product.sku && (
                                                                <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">
                                                                    {product.sku}
                                                                </span>
                                                            )}
                                                            {product.variants.length > 0 && (
                                                                <span className="text-indigo-600 font-medium">
                                                                    · {product.variants.length} variants
                                                                </span>
                                                            )}
                                                            {product.labels.length > 0 && (
                                                                <span>· {product.labels.join(', ')}</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-5 py-3.5 text-gray-700">
                                                        {product.category_name ? (
                                                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                                                {product.category_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Uncategorized</span>
                                                        )}
                                                    </td>

                                                    {/* Dine-In Price */}
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-gray-900">
                                                        {money(product.price_dine_in)}
                                                    </td>

                                                    {/* Takeaway Price */}
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-700">
                                                        {money(product.price_takeaway)}
                                                    </td>

                                                    {/* Delivery Price */}
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-700">
                                                        {money(product.price_delivery)}
                                                    </td>

                                                    {/* Cost Price */}
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-500">
                                                        {product.cost_price > 0 ? money(product.cost_price) : '—'}
                                                    </td>

                                                    {/* Stock Tracking Mode */}
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-xs text-gray-600 capitalize">
                                                            {product.inventory_mode === 'none'
                                                                ? 'Untracked'
                                                                : product.inventory_mode === 'recipe'
                                                                  ? 'Recipe (BOM)'
                                                                  : 'Tracked Stock'}
                                                        </span>
                                                    </td>

                                                    {/* Status Badges */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <Badge tone={product.is_active ? 'success' : 'neutral'}>
                                                                {product.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                            {!product.is_available && (
                                                                <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-700">
                                                                    86 / Out of Stock
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    {canManage && (
                                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditing(product)}
                                                                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-subtle"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPendingDelete(product)}
                                                                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition shadow-subtle"
                                                                    title="Delete Product"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {products.links && products.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            <div className="text-xs text-gray-500">
                                Showing {products.from ?? 1} to {products.to ?? products.data.length} of {products.total ?? products.data.length} items
                            </div>
                            <div className="flex gap-1">
                                {products.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url ?? '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-restrly-600 text-white shadow-subtle'
                                                : link.url
                                                  ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                                  : 'opacity-40 cursor-not-allowed border border-gray-200 text-gray-400'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL 1: PRODUCT EDITOR --- */}
            {editing && canManage && (
                <ProductEditorModal
                    product={editing === 'new' ? null : editing}
                    categories={categories}
                    inventoryModes={inventoryModes}
                    onClose={() => setEditing(null)}
                />
            )}

            {/* --- MODAL 2: CATEGORY MANAGER --- */}
            {showCategoriesModal && canManage && (
                <CategoryManagerModal
                    categories={categories}
                    onClose={() => setShowCategoriesModal(false)}
                />
            )}

            {/* --- CONFIRM DELETE DIALOG --- */}
            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Delete Product "${pendingDelete?.name ?? ''}"?`}
                description="Products linked to existing sales orders cannot be removed. Are you sure you want to permanently delete this menu item?"
                confirmLabel="Delete product"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('menu.products.destroy', pendingDelete.id), {
                            preserveScroll: true,
                            onFinish: () => setPendingDelete(null),
                        });
                    }
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}

// --- SUB-COMPONENTS ---

/**
 * Product Editor Modal: Sectioned drawer for basic details, channel pricing, variants, and stock tracking.
 */
function ProductEditorModal({
    product,
    categories,
    inventoryModes,
    onClose,
}: {
    product: Product | null;
    categories: Category[];
    inventoryModes: { value: string; label: string }[];
    onClose: () => void;
}) {
    const form = useForm({
        name: product?.name ?? '',
        category_id: product?.category_id ?? ('' as number | ''),
        sku: product?.sku ?? '',
        barcode: product?.barcode ?? '',
        tax_category: product?.tax_category ?? '',
        price_dine_in: product?.price_dine_in ?? 10,
        price_takeaway: product?.price_takeaway ?? 10,
        price_delivery: product?.price_delivery ?? 12,
        cost_price: product?.cost_price ?? 3,
        inventory_mode: product?.inventory_mode ?? 'none',
        is_active: product?.is_active ?? true,
        is_available: product?.is_available ?? true,
        sort_order: product?.sort_order ?? 0,
        labels: (product?.labels ?? []).join(', '),
        variants: (product?.variants ?? []).map((v) => ({
            name: v.name,
            sku: v.sku ?? '',
            price: v.price ?? '',
        })) as { name: string; sku: string; price: number | string }[],
    });

    // Gross margin preview calculation
    const grossMargin = useMemo(() => {
        const dineIn = Number(form.data.price_dine_in) || 0;
        const cost = Number(form.data.cost_price) || 0;
        if (dineIn <= 0 || cost <= 0) return null;
        const profit = dineIn - cost;
        const pct = Math.round((profit / dineIn) * 100);
        return { profit, pct };
    }, [form.data.price_dine_in, form.data.cost_price]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = {
            ...form.data,
            labels: form.data.labels
                ? form.data.labels.split(',').map((l) => l.trim()).filter(Boolean)
                : [],
        };

        form.transform(() => payload);

        if (product) {
            form.patch(route('menu.products.update', product.id), {
                preserveScroll: true,
                onSuccess: onClose,
            });
        } else {
            form.post(route('menu.products.store'), {
                preserveScroll: true,
                onSuccess: onClose,
            });
        }
    };

    const addVariant = () =>
        form.setData('variants', [
            ...form.data.variants,
            { name: '', sku: '', price: '' },
        ]);

    const updateVariant = (index: number, patch: Record<string, unknown>) => {
        form.setData(
            'variants',
            form.data.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-base font-bold text-gray-900">
                        {product ? `Edit Product: ${product.name}` : 'Create New Menu Product'}
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={submit} className="mt-4 space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-medium text-gray-900"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="e.g. Classic Wagyu Burger"
                                required
                            />
                            {form.errors.name && (
                                <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                                Category
                            </label>
                            <select
                                className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-semibold text-gray-800"
                                value={form.data.category_id ?? ''}
                                onChange={(e) =>
                                    form.setData('category_id', e.target.value ? Number(e.target.value) : '')
                                }
                            >
                                <option value="">Uncategorised</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                                Stock Tracking Mode
                            </label>
                            <select
                                className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-semibold text-gray-800"
                                value={form.data.inventory_mode}
                                onChange={(e) => form.setData('inventory_mode', e.target.value)}
                            >
                                {inventoryModes.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                                SKU / Item Code
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-mono font-medium text-gray-900"
                                value={form.data.sku}
                                onChange={(e) => form.setData('sku', e.target.value)}
                                placeholder="e.g. BRG-001"
                            />
                            {form.errors.sku && (
                                <p className="mt-1 text-xs text-red-600">{form.errors.sku}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                                Barcode (EAN / UPC)
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-mono font-medium text-gray-900"
                                value={form.data.barcode}
                                onChange={(e) => form.setData('barcode', e.target.value)}
                                placeholder="e.g. 501234567890"
                            />
                        </div>
                    </div>

                    {/* Multi-Channel Pricing Box */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Multi-Channel Pricing
                            </span>
                            {grossMargin && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                    Gross Margin: {grossMargin.pct}% ({money(grossMargin.profit)} profit)
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                                    Dine-In Price ($) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 font-mono text-xs font-bold text-gray-900"
                                    value={form.data.price_dine_in}
                                    onChange={(e) => form.setData('price_dine_in', Number(e.target.value))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                                    Takeaway Price ($) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 font-mono text-xs font-bold text-gray-900"
                                    value={form.data.price_takeaway}
                                    onChange={(e) => form.setData('price_takeaway', Number(e.target.value))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                                    Delivery Price ($) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 font-mono text-xs font-bold text-gray-900"
                                    value={form.data.price_delivery}
                                    onChange={(e) => form.setData('price_delivery', Number(e.target.value))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                                    Cost Price ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 px-2.5 font-mono text-xs font-medium text-gray-600"
                                    value={form.data.cost_price}
                                    onChange={(e) => form.setData('cost_price', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Labels & Tags */}
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                            Labels &amp; Badges (comma separated)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Popular, Spicy, Chef Special, Vegan"
                            className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs text-gray-900"
                            value={form.data.labels}
                            onChange={(e) => form.setData('labels', e.target.value)}
                        />
                    </div>

                    {/* Active & Available Toggles */}
                    <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-restrly-600 focus:ring-restrly-500"
                                checked={form.data.is_active}
                                onChange={(e) => form.setData('is_active', e.target.checked)}
                            />
                            <span>Active in Catalog</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-restrly-600 focus:ring-restrly-500"
                                checked={form.data.is_available}
                                onChange={(e) => form.setData('is_available', e.target.checked)}
                            />
                            <span>Available on POS (In Stock)</span>
                        </label>
                    </div>

                    {/* Product Variants Section */}
                    <div className="rounded-xl border border-gray-200 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">
                                Product Variants &amp; Sizing ({form.data.variants.length})
                            </span>
                            <button
                                type="button"
                                onClick={addVariant}
                                className="text-xs font-bold text-restrly-600 hover:text-restrly-800"
                            >
                                + Add Variant
                            </button>
                        </div>

                        <div className="space-y-2">
                            {form.data.variants.map((variant, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        placeholder="Variant Name (e.g. Large, Double Patty)"
                                        className="flex-1 rounded-xl border border-gray-300 py-1.5 px-2.5 text-xs font-medium text-gray-900"
                                        value={variant.name}
                                        onChange={(e) => updateVariant(index, { name: e.target.value })}
                                    />
                                    <input
                                        placeholder="SKU suffix"
                                        className="w-28 rounded-xl border border-gray-300 py-1.5 px-2.5 font-mono text-xs text-gray-700"
                                        value={variant.sku}
                                        onChange={(e) => updateVariant(index, { sku: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Price override"
                                        className="w-28 rounded-xl border border-gray-300 py-1.5 px-2.5 font-mono text-xs font-bold text-gray-900 text-right"
                                        value={variant.price}
                                        onChange={(e) => updateVariant(index, { price: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'variants',
                                                form.data.variants.filter((_, i) => i !== index),
                                            )
                                        }
                                        className="text-xs text-red-500 hover:text-red-700 p-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl bg-restrly-600 px-5 py-2 text-xs font-bold text-white shadow-card hover:bg-restrly-700 disabled:opacity-50"
                        >
                            {form.processing ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Category Manager Modal: Add, edit, and organize menu categories.
 */
function CategoryManagerModal({
    categories,
    onClose,
}: {
    categories: Category[];
    onClose: () => void;
}) {
    const form = useForm({ name: '', sort_order: 0 });
    const [editingId, setEditingId] = useState<number | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingId) {
            form.patch(route('menu.categories.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setEditingId(null);
                },
            });
        } else {
            form.post(route('menu.categories.store'), {
                preserveScroll: true,
                onSuccess: () => form.reset(),
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-base font-bold text-gray-900">Manage Menu Categories</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Add / Edit Category Form */}
                <form onSubmit={submit} className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-3">
                    <span className="text-xs font-bold text-gray-700 block">
                        {editingId ? 'Edit Category' : 'Add New Category'}
                    </span>
                    <div className="flex gap-2">
                        <input
                            placeholder="Category Name (e.g. Appetizers)"
                            className="flex-1 rounded-xl border border-gray-300 py-1.5 px-3 text-xs font-medium text-gray-900 bg-white"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Sort order"
                            className="w-24 rounded-xl border border-gray-300 py-1.5 px-2 text-xs font-mono font-medium text-gray-900 bg-white text-center"
                            value={form.data.sort_order}
                            onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                        />
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl bg-restrly-600 px-4 py-1.5 text-xs font-bold text-white shadow-subtle hover:bg-restrly-700 disabled:opacity-50"
                        >
                            {editingId ? 'Update' : 'Add'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={() => {
                                    form.reset();
                                    setEditingId(null);
                                }}
                                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    {form.errors.name && (
                        <p className="text-xs text-red-600">{form.errors.name}</p>
                    )}
                </form>

                {/* Categories List */}
                <div className="mt-4 divide-y divide-gray-100">
                    {categories.map((c) => (
                        <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                                <span className="font-bold text-gray-900">{c.name}</span>
                                <span className="ml-2 text-gray-400">
                                    ({c.products_count} items · Sort: {c.sort_order})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingId(c.id);
                                        form.setData({ name: c.name, sort_order: c.sort_order });
                                    }}
                                    className="text-xs font-bold text-restrly-700 hover:text-restrly-900"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm(`Delete category "${c.name}"? Products in it will become uncategorized.`)) {
                                            router.delete(route('menu.categories.destroy', c.id), { preserveScroll: true });
                                        }
                                    }}
                                    className="text-xs font-bold text-red-600 hover:text-red-800"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {categories.length === 0 && (
                        <p className="py-6 text-center text-xs text-gray-400">
                            No categories created yet.
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
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
