import { Button, ConfirmDialog, PageHeader } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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
}

const input = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

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
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('menu.manage');

    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<Product | 'new' | null>(null);
    const [showCategories, setShowCategories] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

    const applyFilters = (params: Record<string, unknown>) => {
        router.get(
            route('menu.index'),
            { search, category_id: filters.category_id, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const deleteProduct = (product: Product) => setPendingDelete(product);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Menu & products"
                    description="Categories, products, pricing and availability."
                    actions={
                        canManage && (
                            <>
                                <Button size="sm" variant="secondary" onClick={() => setShowCategories((v) => !v)}>
                                    Categories
                                </Button>
                                <Button size="sm" onClick={() => setEditing('new')}>
                                    New product
                                </Button>
                            </>
                        )
                    }
                />
            }
        >
            <Head title="Menu" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}

                    {showCategories && canManage && (
                        <CategoryManager categories={categories} />
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters({});
                                }}
                                className="flex flex-1 gap-2"
                            >
                                <input
                                    type="text"
                                    placeholder="Search name, SKU or barcode"
                                    className="w-full max-w-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
                                >
                                    Search
                                </button>
                            </form>

                            <select
                                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.category_id ?? ''}
                                onChange={(e) =>
                                    applyFilters({
                                        category_id: e.target.value || null,
                                    })
                                }
                            >
                                <option value="">All categories</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Product</th>
                                    <th className="py-2">Category</th>
                                    <th className="py-2 text-right">Dine-in</th>
                                    <th className="py-2 text-right">Takeaway</th>
                                    <th className="py-2 text-right">Delivery</th>
                                    <th className="py-2">Stock</th>
                                    <th className="py-2">Status</th>
                                    {canManage && (
                                        <th className="py-2 text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.data.map((product) => (
                                    <tr key={product.id}>
                                        <td className="py-3">
                                            <div className="font-medium text-gray-800">
                                                {product.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {product.sku ?? 'No SKU'}
                                                {product.labels.length > 0 &&
                                                    ' · ' +
                                                        product.labels.join(', ')}
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {product.category_name ?? '—'}
                                        </td>
                                        <td className="py-3 text-right text-gray-700">
                                            {product.price_dine_in.toFixed(2)}
                                        </td>
                                        <td className="py-3 text-right text-gray-700">
                                            {product.price_takeaway.toFixed(2)}
                                        </td>
                                        <td className="py-3 text-right text-gray-700">
                                            {product.price_delivery.toFixed(2)}
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {product.inventory_mode === 'none'
                                                ? '—'
                                                : product.inventory_mode}
                                        </td>
                                        <td className="py-3">
                                            <span
                                                className={
                                                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                                                    (product.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-200 text-gray-600')
                                                }
                                            >
                                                {product.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td className="py-3 text-right">
                                                <div className="flex justify-end gap-3 text-xs">
                                                    <button
                                                        onClick={() =>
                                                            setEditing(product)
                                                        }
                                                        className="text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            deleteProduct(product)
                                                        }
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {products.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-8 text-center text-gray-500"
                                        >
                                            No products yet. Create your first
                                            product to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {products.links.length > 3 && (
                            <div className="mt-4 flex flex-wrap gap-1">
                                {products.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            preserveScroll
                                            className={
                                                'rounded px-3 py-1 text-sm ' +
                                                (link.active
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-gray-700 hover:bg-gray-100')
                                            }
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="px-3 py-1 text-sm text-gray-400"
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {editing && canManage && (
                <ProductEditor
                    product={editing === 'new' ? null : editing}
                    categories={categories}
                    inventoryModes={inventoryModes}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Delete "${pendingDelete?.name ?? ''}"?`}
                description="Products used on existing orders cannot be removed. This cannot be undone."
                confirmLabel="Delete product"
                onConfirm={() => {
                    if (pendingDelete) router.delete(route('menu.products.destroy', pendingDelete.id), { preserveScroll: true, onFinish: () => setPendingDelete(null) });
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}

function CategoryManager({ categories }: { categories: Category[] }) {
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
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
                Categories
            </h3>

            <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
                <div className="flex-1">
                    <label className="text-sm text-gray-700">Name</label>
                    <input
                        className={input}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        required
                    />
                </div>
                <div className="w-28">
                    <label className="text-sm text-gray-700">Sort</label>
                    <input
                        type="number"
                        className={input}
                        value={form.data.sort_order}
                        onChange={(e) =>
                            form.setData('sort_order', Number(e.target.value))
                        }
                    />
                </div>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                    >
                        Cancel
                    </button>
                )}
                {form.errors.name && (
                    <p className="w-full text-sm text-red-600">
                        {form.errors.name}
                    </p>
                )}
            </form>

            <ul className="divide-y divide-gray-100">
                {categories.map((category) => (
                    <li
                        key={category.id}
                        className="flex items-center justify-between py-2 text-sm"
                    >
                        <span className="text-gray-800">
                            {category.name}{' '}
                            <span className="text-xs text-gray-400">
                                ({category.products_count} products)
                            </span>
                        </span>
                        <div className="flex gap-3 text-xs">
                            <button
                                onClick={() => {
                                    setEditingId(category.id);
                                    form.setData({
                                        name: category.name,
                                        sort_order: category.sort_order,
                                    });
                                }}
                                className="text-indigo-600 hover:text-indigo-700"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() =>
                                    router.delete(
                                        route(
                                            'menu.categories.destroy',
                                            category.id,
                                        ),
                                        { preserveScroll: true },
                                    )
                                }
                                className="text-red-600 hover:text-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
                {categories.length === 0 && (
                    <li className="py-3 text-sm text-gray-500">
                        No categories yet.
                    </li>
                )}
            </ul>
        </div>
    );
}

function ProductEditor({
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
        price_dine_in: product?.price_dine_in ?? 0,
        price_takeaway: product?.price_takeaway ?? 0,
        price_delivery: product?.price_delivery ?? 0,
        cost_price: product?.cost_price ?? 0,
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
            form.data.variants.map((v, i) =>
                i === index ? { ...v, ...patch } : v,
            ),
        );
    };

    return (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
            <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900">
                    {product ? 'Edit product' : 'New product'}
                </h3>

                <form onSubmit={submit} className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="text-sm text-gray-700">Name</label>
                            <input
                                className={input}
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                required
                            />
                            {form.errors.name && (
                                <p className="mt-1 text-sm text-red-600">
                                    {form.errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">
                                Category
                            </label>
                            <select
                                className={input}
                                value={form.data.category_id ?? ''}
                                onChange={(e) =>
                                    form.setData(
                                        'category_id',
                                        e.target.value
                                            ? Number(e.target.value)
                                            : '',
                                    )
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
                            <label className="text-sm text-gray-700">
                                Stock tracking
                            </label>
                            <select
                                className={input}
                                value={form.data.inventory_mode}
                                onChange={(e) =>
                                    form.setData('inventory_mode', e.target.value)
                                }
                            >
                                {inventoryModes.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">SKU</label>
                            <input
                                className={input}
                                value={form.data.sku}
                                onChange={(e) =>
                                    form.setData('sku', e.target.value)
                                }
                            />
                            {form.errors.sku && (
                                <p className="mt-1 text-sm text-red-600">
                                    {form.errors.sku}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">
                                Barcode
                            </label>
                            <input
                                className={input}
                                value={form.data.barcode}
                                onChange={(e) =>
                                    form.setData('barcode', e.target.value)
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">
                                Dine-in price
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className={input}
                                value={form.data.price_dine_in}
                                onChange={(e) =>
                                    form.setData(
                                        'price_dine_in',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">
                                Takeaway price
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className={input}
                                value={form.data.price_takeaway}
                                onChange={(e) =>
                                    form.setData(
                                        'price_takeaway',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">
                                Delivery price
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className={input}
                                value={form.data.price_delivery}
                                onChange={(e) =>
                                    form.setData(
                                        'price_delivery',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-700">
                                Cost price
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className={input}
                                value={form.data.cost_price}
                                onChange={(e) =>
                                    form.setData(
                                        'cost_price',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-sm text-gray-700">
                                Labels (comma separated)
                            </label>
                            <input
                                className={input}
                                placeholder="popular, new, seasonal"
                                value={form.data.labels}
                                onChange={(e) =>
                                    form.setData('labels', e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600"
                                checked={form.data.is_active}
                                onChange={(e) =>
                                    form.setData('is_active', e.target.checked)
                                }
                            />
                            Active
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600"
                                checked={form.data.is_available}
                                onChange={(e) =>
                                    form.setData(
                                        'is_available',
                                        e.target.checked,
                                    )
                                }
                            />
                            Available
                        </label>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-700">
                                Variants (optional)
                            </label>
                            <button
                                type="button"
                                onClick={addVariant}
                                className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                                + Add variant
                            </button>
                        </div>
                        <div className="mt-2 space-y-2">
                            {form.data.variants.map((variant, index) => (
                                <div
                                    key={index}
                                    className="flex gap-2"
                                >
                                    <input
                                        placeholder="Name (e.g. Large)"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={variant.name}
                                        onChange={(e) =>
                                            updateVariant(index, {
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Price"
                                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={variant.price}
                                        onChange={(e) =>
                                            updateVariant(index, {
                                                price: e.target.value,
                                            })
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'variants',
                                                form.data.variants.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                        className="text-sm text-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {product ? 'Save changes' : 'Create product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
