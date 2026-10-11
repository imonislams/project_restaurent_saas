import { Badge, PageHeader } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Named {
    id: number;
    name: string;
}

interface Branch extends Named {}

interface Location {
    id: number;
    name: string;
    branch_id: number;
    branch_name: string | null;
}

interface Unit {
    id: number;
    name: string;
    code: string;
}

interface Ingredient {
    id: number;
    name: string;
    unit_id: number | null;
    unit_code: string | null;
    cost_per_unit: number;
    track_inventory: boolean;
    is_active: boolean;
}

interface Balance {
    id: number;
    branch_name: string | null;
    location_name: string | null;
    item_type: string;
    item_name: string;
    quantity: number;
}

interface Movement {
    id: number;
    created_at: string | null;
    item_type: string;
    item_name: string;
    quantity_delta: number;
    reason: string;
    reason_label: string;
    location_name: string | null;
    note: string | null;
    user_name: string | null;
}

const input =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

export default function InventoryIndex({
    branches,
    locations,
    units,
    ingredients,
    products,
    balances,
    movements,
    allowNegative,
}: {
    branches: Branch[];
    locations: Location[];
    units: Unit[];
    ingredients: Ingredient[];
    products: Named[];
    balances: Balance[];
    movements: Movement[];
    allowNegative: boolean;
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('inventory.manage');
    const canAdjust = auth.permissions.includes('inventory.adjust');

    const stockForm = useForm({
        mode: 'opening' as 'opening' | 'adjust',
        branch_id: branches[0]?.id ?? ('' as number | ''),
        stock_location_id: '' as number | '',
        item_type: 'ingredient' as 'ingredient' | 'product',
        item_id: '' as number | '',
        quantity: 0,
        unit_cost: 0,
        note: '',
    });

    const itemOptions: Named[] =
        stockForm.data.item_type === 'product' ? products : ingredients;
    const branchLocations = locations.filter(
        (l) => l.branch_id === Number(stockForm.data.branch_id),
    );

    const submitStock: FormEventHandler = (e) => {
        e.preventDefault();
        const routeName =
            stockForm.data.mode === 'opening'
                ? 'inventory.opening'
                : 'inventory.adjust';

        stockForm.post(route(routeName), {
            preserveScroll: true,
            onSuccess: () =>
                stockForm.setData({
                    ...stockForm.data,
                    quantity: 0,
                    note: '',
                    unit_cost: 0,
                }),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Inventory"
                    description="Stock levels, ingredients, units and the movement ledger."
                    actions={!allowNegative ? <Badge tone="success">Negative stock blocked</Badge> : <Badge tone="warning">Negative stock allowed</Badge>}
                />
            }
        >
            <Head title="Inventory" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
                            {flash.error}
                        </div>
                    )}

                    {allowNegative && (
                        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Negative stock is enabled for this tenant.
                        </div>
                    )}

                    {canAdjust && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        stockForm.setData('mode', 'opening')
                                    }
                                    className={
                                        'rounded-md px-3 py-1.5 text-sm font-medium ' +
                                        (stockForm.data.mode === 'opening'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700')
                                    }
                                >
                                    Opening stock
                                </button>
                                <button
                                    onClick={() =>
                                        stockForm.setData('mode', 'adjust')
                                    }
                                    className={
                                        'rounded-md px-3 py-1.5 text-sm font-medium ' +
                                        (stockForm.data.mode === 'adjust'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700')
                                    }
                                >
                                    Adjustment / count
                                </button>
                            </div>

                            <form
                                onSubmit={submitStock}
                                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                            >
                                <div>
                                    <label className="text-sm text-gray-700">
                                        Branch
                                    </label>
                                    <select
                                        className={input}
                                        value={stockForm.data.branch_id}
                                        onChange={(e) => {
                                            stockForm.setData(
                                                'branch_id',
                                                Number(e.target.value),
                                            );
                                            stockForm.setData(
                                                'stock_location_id',
                                                '',
                                            );
                                        }}
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700">
                                        Location
                                    </label>
                                    <select
                                        className={input}
                                        value={stockForm.data.stock_location_id}
                                        onChange={(e) =>
                                            stockForm.setData(
                                                'stock_location_id',
                                                Number(e.target.value),
                                            )
                                        }
                                        required
                                    >
                                        <option value="">Select…</option>
                                        {branchLocations.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </select>
                                    {stockForm.errors.stock_location_id && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {stockForm.errors.stock_location_id}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700">
                                        Item type
                                    </label>
                                    <select
                                        className={input}
                                        value={stockForm.data.item_type}
                                        onChange={(e) => {
                                            stockForm.setData(
                                                'item_type',
                                                e.target.value as
                                                    | 'ingredient'
                                                    | 'product',
                                            );
                                            stockForm.setData('item_id', '');
                                        }}
                                    >
                                        <option value="ingredient">
                                            Ingredient
                                        </option>
                                        <option value="product">
                                            Product
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700">
                                        Item
                                    </label>
                                    <select
                                        className={input}
                                        value={stockForm.data.item_id}
                                        onChange={(e) =>
                                            stockForm.setData(
                                                'item_id',
                                                Number(e.target.value),
                                            )
                                        }
                                        required
                                    >
                                        <option value="">Select…</option>
                                        {itemOptions.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700">
                                        {stockForm.data.mode === 'opening'
                                            ? 'Opening quantity'
                                            : 'Counted quantity'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className={input}
                                        value={stockForm.data.quantity}
                                        onChange={(e) =>
                                            stockForm.setData(
                                                'quantity',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                    {stockForm.errors.quantity && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {stockForm.errors.quantity}
                                        </p>
                                    )}
                                </div>

                                {stockForm.data.mode === 'opening' ? (
                                    <div>
                                        <label className="text-sm text-gray-700">
                                            Unit cost
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={input}
                                            value={stockForm.data.unit_cost}
                                            onChange={(e) =>
                                                stockForm.setData(
                                                    'unit_cost',
                                                    Number(e.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-sm text-gray-700">
                                            Reason / note
                                        </label>
                                        <input
                                            className={input}
                                            value={stockForm.data.note}
                                            onChange={(e) =>
                                                stockForm.setData(
                                                    'note',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                )}

                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={stockForm.processing}
                                        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {stockForm.data.mode === 'opening'
                                            ? 'Record opening stock'
                                            : 'Apply adjustment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">
                            Stock on hand
                        </h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Item</th>
                                    <th className="py-2">Type</th>
                                    <th className="py-2">Branch</th>
                                    <th className="py-2">Location</th>
                                    <th className="py-2 text-right">On hand</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {balances.map((b) => (
                                    <tr key={b.id}>
                                        <td className="py-3 text-gray-800">
                                            {b.item_name}
                                        </td>
                                        <td className="py-3 capitalize text-gray-500">
                                            {b.item_type}
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {b.branch_name}
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {b.location_name}
                                        </td>
                                        <td
                                            className={
                                                'py-3 text-right font-medium ' +
                                                (b.quantity <= 0
                                                    ? 'text-red-600'
                                                    : 'text-gray-800')
                                            }
                                        >
                                            {b.quantity.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                                {balances.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-gray-500"
                                        >
                                            No stock recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">
                            Recent movements
                        </h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">When</th>
                                    <th className="py-2">Item</th>
                                    <th className="py-2">Reason</th>
                                    <th className="py-2">Location</th>
                                    <th className="py-2 text-right">Change</th>
                                    <th className="py-2">By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {movements.map((m) => (
                                    <tr key={m.id}>
                                        <td className="py-3 text-gray-500">
                                            {m.created_at
                                                ? new Date(
                                                      m.created_at,
                                                  ).toLocaleString()
                                                : '—'}
                                        </td>
                                        <td className="py-3 text-gray-800">
                                            {m.item_name}
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {m.reason_label}
                                            {m.note && (
                                                <span className="block text-xs text-gray-400">
                                                    {m.note}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {m.location_name}
                                        </td>
                                        <td
                                            className={
                                                'py-3 text-right font-medium ' +
                                                (m.quantity_delta < 0
                                                    ? 'text-red-600'
                                                    : 'text-green-700')
                                            }
                                        >
                                            {m.quantity_delta > 0 ? '+' : ''}
                                            {m.quantity_delta.toFixed(3)}
                                        </td>
                                        <td className="py-3 text-gray-500">
                                            {m.user_name ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                                {movements.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-8 text-center text-gray-500"
                                        >
                                            No stock movements yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {canManage && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <UnitsPanel units={units} />
                            <IngredientsPanel
                                ingredients={ingredients}
                                units={units}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function UnitsPanel({ units }: { units: Unit[] }) {
    const form = useForm({ name: '', code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('inventory.units.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Units</h3>
            <form onSubmit={submit} className="mb-4 flex items-end gap-2">
                <div className="flex-1">
                    <label className="text-sm text-gray-700">Name</label>
                    <input
                        className={input}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        required
                    />
                </div>
                <div className="w-24">
                    <label className="text-sm text-gray-700">Code</label>
                    <input
                        className={input}
                        value={form.data.code}
                        onChange={(e) => form.setData('code', e.target.value)}
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    Add
                </button>
            </form>
            {form.errors.code && (
                <p className="mb-2 text-sm text-red-600">{form.errors.code}</p>
            )}
            <ul className="divide-y divide-gray-100 text-sm">
                {units.map((u) => (
                    <li key={u.id} className="flex items-center justify-between py-2">
                        <span className="text-gray-800">
                            {u.name}{' '}
                            <span className="text-xs text-gray-400">
                                ({u.code})
                            </span>
                        </span>
                        <button
                            onClick={() =>
                                router.delete(
                                    route('inventory.units.destroy', u.id),
                                    { preserveScroll: true },
                                )
                            }
                            className="text-xs text-red-600 hover:text-red-700"
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function IngredientsPanel({
    ingredients,
    units,
}: {
    ingredients: Ingredient[];
    units: Unit[];
}) {
    const form = useForm({
        name: '',
        unit_id: '' as number | '',
        cost_per_unit: 0,
        track_inventory: true,
        is_active: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('inventory.ingredients.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
                Ingredients
            </h3>
            <form onSubmit={submit} className="mb-4 space-y-2">
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <label className="text-sm text-gray-700">Name</label>
                        <input
                            className={input}
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            required
                        />
                    </div>
                    <div className="w-28">
                        <label className="text-sm text-gray-700">Unit</label>
                        <select
                            className={input}
                            value={form.data.unit_id}
                            onChange={(e) =>
                                form.setData(
                                    'unit_id',
                                    e.target.value
                                        ? Number(e.target.value)
                                        : '',
                                )
                            }
                        >
                            <option value="">—</option>
                            {units.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.code}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-28">
                        <label className="text-sm text-gray-700">Cost</label>
                        <input
                            type="number"
                            step="0.01"
                            className={input}
                            value={form.data.cost_per_unit}
                            onChange={(e) =>
                                form.setData(
                                    'cost_per_unit',
                                    Number(e.target.value),
                                )
                            }
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
            </form>
            <ul className="divide-y divide-gray-100 text-sm">
                {ingredients.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2">
                        <span className="text-gray-800">
                            {i.name}{' '}
                            <span className="text-xs text-gray-400">
                                {i.unit_code ? `(${i.unit_code})` : ''} ·{' '}
                                {i.cost_per_unit.toFixed(2)}
                            </span>
                        </span>
                        <button
                            onClick={() =>
                                router.delete(
                                    route(
                                        'inventory.ingredients.destroy',
                                        i.id,
                                    ),
                                    { preserveScroll: true },
                                )
                            }
                            className="text-xs text-red-600 hover:text-red-700"
                        >
                            Delete
                        </button>
                    </li>
                ))}
                {ingredients.length === 0 && (
                    <li className="py-2 text-gray-500">No ingredients yet.</li>
                )}
            </ul>
        </div>
    );
}
