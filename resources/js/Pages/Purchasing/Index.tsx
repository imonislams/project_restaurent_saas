import Modal from '@/Components/Modal';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
    Tabs,
} from '@/Components/ui';
import type { BadgeTone, TabItem } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

interface ItemOption {
    value: string;
    label: string;
    type: string;
    id: number;
    cost: number;
}

interface Supplier {
    id: number;
    name: string;
    contact_name: string | null;
    phone: string | null;
    outstanding: number;
    is_active: boolean;
}

interface OrderRow {
    id: number;
    number: string;
    supplier: string | null;
    branch: string | null;
    status: string;
    status_label: string;
    items_count: number;
    total: number;
    is_receivable: boolean;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    received: 'success',
    approved: 'info',
    cancelled: 'danger',
    submitted: 'warning',
    draft: 'neutral',
};

export default function PurchasingIndex({
    suppliers,
    orders,
    branches,
    items,
}: {
    suppliers: Supplier[];
    orders: OrderRow[];
    branches: { id: number; name: string }[];
    items: ItemOption[];
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('purchasing.manage');

    const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
    const [orderSearch, setOrderSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [supplierSearch, setSupplierSearch] = useState('');

    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [orderModalOpen, setOrderModalOpen] = useState(false);

    // Supplier Form
    const supplierForm = useForm({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
    });

    // Purchase Order Form
    const orderForm = useForm({
        supplier_id: (suppliers[0]?.id ?? '') as number | '',
        branch_id: (branches[0]?.id ?? '') as number | '',
        notes: '',
        items: [{ value: '', quantity: 1, unit_cost: 0 }] as {
            value: string;
            quantity: number;
            unit_cost: number;
        }[],
    });

    // PO multi-line helpers
    const addLine = () => {
        orderForm.setData('items', [
            ...orderForm.data.items,
            { value: '', quantity: 1, unit_cost: 0 },
        ]);
    };

    const removeLine = (index: number) => {
        if (orderForm.data.items.length <= 1) return;
        orderForm.setData(
            'items',
            orderForm.data.items.filter((_, idx) => idx !== index)
        );
    };

    const updateLineItem = (index: number, val: string) => {
        const opt = items.find((i) => i.value === val);
        const next = [...orderForm.data.items];
        next[index] = {
            ...next[index],
            value: val,
            unit_cost: opt?.cost ?? 0,
        };
        orderForm.setData('items', next);
    };

    const updateLineQty = (index: number, qty: number) => {
        const next = [...orderForm.data.items];
        next[index] = { ...next[index], quantity: qty };
        orderForm.setData('items', next);
    };

    const updateLineCost = (index: number, cost: number) => {
        const next = [...orderForm.data.items];
        next[index] = { ...next[index], unit_cost: cost };
        orderForm.setData('items', next);
    };

    const calculatedOrderTotal = useMemo(() => {
        return orderForm.data.items.reduce(
            (sum, item) => sum + (item.quantity > 0 ? item.quantity * item.unit_cost : 0),
            0
        );
    }, [orderForm.data.items]);

    // Submissions
    const submitSupplier: FormEventHandler = (e) => {
        e.preventDefault();
        supplierForm.post(route('purchasing.suppliers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                supplierForm.reset();
                setSupplierModalOpen(false);
            },
        });
    };

    const submitOrder: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = {
            supplier_id: orderForm.data.supplier_id,
            branch_id: orderForm.data.branch_id,
            notes: orderForm.data.notes,
            items: orderForm.data.items
                .filter((i) => i.value)
                .map((i) => {
                    const [item_type, item_id] = i.value.split(':');
                    return {
                        item_type,
                        item_id: Number(item_id),
                        quantity: Number(i.quantity),
                        unit_cost: Number(i.unit_cost),
                    };
                }),
        };

        orderForm.transform(() => payload);
        orderForm.post(route('purchasing.orders.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setOrderModalOpen(false);
                orderForm.reset();
            },
        });
    };

    // KPI Metrics
    const totalOrderVolume = useMemo(() => orders.reduce((s, o) => s + o.total, 0), [orders]);
    const receivableOrdersCount = useMemo(() => orders.filter((o) => o.is_receivable).length, [orders]);
    const totalSupplierDebt = useMemo(() => suppliers.reduce((s, sup) => s + sup.outstanding, 0), [suppliers]);

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            if (statusFilter !== 'all' && o.status !== statusFilter) return false;
            if (orderSearch) {
                const q = orderSearch.toLowerCase();
                const matchNum = o.number.toLowerCase().includes(q);
                const matchSup = o.supplier?.toLowerCase().includes(q);
                const matchBranch = o.branch?.toLowerCase().includes(q);
                if (!matchNum && !matchSup && !matchBranch) return false;
            }
            return true;
        });
    }, [orders, statusFilter, orderSearch]);

    // Filtered suppliers
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter((s) => {
            if (!supplierSearch) return true;
            const q = supplierSearch.toLowerCase();
            return (
                s.name.toLowerCase().includes(q) ||
                (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
                (s.phone && s.phone.toLowerCase().includes(q))
            );
        });
    }, [suppliers, supplierSearch]);

    const tabs: TabItem[] = [
        {
            key: 'orders',
            label: 'Purchase Orders',
            badge: orders.length,
        },
        {
            key: 'suppliers',
            label: 'Suppliers Directory',
            badge: suppliers.length,
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Purchasing & Suppliers"
                    description="Issue purchase orders, track supplier accounts payable, and receive stock deliveries."
                    actions={
                        canManage && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setSupplierModalOpen(true)}
                                >
                                    + Add Supplier
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setOrderModalOpen(true)}
                                >
                                    + New Purchase Order
                                </Button>
                            </div>
                        )
                    }
                />
            }
        >
            <Head title="Purchasing & Suppliers" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Total PO Volume"
                            value={`$${totalOrderVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            hint={`${orders.length} total purchase orders`}
                        />
                        <KpiCard
                            label="Ready to Receive"
                            value={receivableOrdersCount}
                            tone={receivableOrdersCount > 0 ? 'warning' : 'neutral'}
                            hint={receivableOrdersCount > 0 ? 'Awaiting kitchen delivery check-in' : 'No shipments awaiting receipt'}
                        />
                        <KpiCard
                            label="Supplier Accounts Payable"
                            value={`$${totalSupplierDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            tone={totalSupplierDebt > 0 ? 'warning' : 'neutral'}
                            hint="Outstanding balance due across all vendors"
                        />
                        <KpiCard
                            label="Active Vendors"
                            value={suppliers.length}
                            hint="Registered ingredient and goods suppliers"
                        />
                    </div>

                    {/* Navigation Tabs */}
                    <Tabs
                        tabs={tabs}
                        value={activeTab}
                        onChange={(tabKey) => setActiveTab(tabKey as any)}
                    />

                    {/* TAB 1: PURCHASE ORDERS */}
                    {activeTab === 'orders' && (
                        <Card>
                            <CardHeader
                                title="Purchase Orders"
                                description="Track purchase requisitions from approval to partial or full goods receipt."
                                action={
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search PO #, supplier, branch…"
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            className="h-9 w-52 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-64"
                                        />
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="draft">Draft</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="approved">Approved</option>
                                            <option value="received">Received</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredOrders.length === 0 ? (
                                    <EmptyState
                                        title="No Purchase Orders Found"
                                        description={
                                            orderSearch || statusFilter !== 'all'
                                                ? 'No purchase orders match your active search filters.'
                                                : 'No purchase orders have been created yet.'
                                        }
                                        action={
                                            canManage && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => setOrderModalOpen(true)}
                                                >
                                                    Create First Order
                                                </Button>
                                            )
                                        }
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">PO Number</th>
                                                    <th className="px-6 py-3.5">Vendor / Supplier</th>
                                                    <th className="px-6 py-3.5">Target Branch</th>
                                                    <th className="px-6 py-3.5 text-right">Items</th>
                                                    <th className="px-6 py-3.5 text-right">PO Total</th>
                                                    <th className="px-6 py-3.5 text-center">Order Status</th>
                                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredOrders.map((o) => (
                                                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-6 py-4 font-mono font-bold whitespace-nowrap">
                                                            <Link
                                                                href={route('purchasing.orders.show', o.id)}
                                                                className="text-primary hover:text-primary/80"
                                                            >
                                                                {o.number}
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {o.supplier ?? 'General Supplier'}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">
                                                            {o.branch ?? '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono tabular-nums text-gray-600">
                                                            {o.items_count} {o.items_count === 1 ? 'item' : 'items'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold tabular-nums text-gray-900">
                                                            ${o.total.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>
                                                                {o.status_label}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Link
                                                                    href={route('purchasing.orders.show', o.id)}
                                                                    className="text-xs font-semibold text-primary hover:text-primary/80"
                                                                >
                                                                    View Details
                                                                </Link>
                                                                {o.is_receivable && canManage && (
                                                                    <Link
                                                                        href={route('purchasing.orders.show', o.id)}
                                                                        className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                                                    >
                                                                        Receive Goods
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* TAB 2: SUPPLIERS DIRECTORY */}
                    {activeTab === 'suppliers' && (
                        <Card>
                            <CardHeader
                                title="Suppliers Directory"
                                description="Manage vendor accounts, contact numbers, and monitor accounts payable balances."
                                action={
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search suppliers…"
                                            value={supplierSearch}
                                            onChange={(e) => setSupplierSearch(e.target.value)}
                                            className="h-9 w-48 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-60"
                                        />
                                        {canManage && (
                                            <Button
                                                size="sm"
                                                onClick={() => setSupplierModalOpen(true)}
                                            >
                                                + Add Supplier
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredSuppliers.length === 0 ? (
                                    <EmptyState
                                        title="No Suppliers Found"
                                        description="Add suppliers to associate with purchase orders and ingredient supplies."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Supplier Name</th>
                                                    <th className="px-6 py-3.5">Contact Person</th>
                                                    <th className="px-6 py-3.5">Phone Number</th>
                                                    <th className="px-6 py-3.5 text-right">Outstanding Balance</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredSuppliers.map((s) => (
                                                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                                            {s.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">
                                                            {s.contact_name ?? '—'}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                                            {s.phone ?? '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span
                                                                className={`font-mono font-bold tabular-nums ${
                                                                    s.outstanding > 0
                                                                        ? 'text-rose-600'
                                                                        : 'text-gray-600'
                                                                }`}
                                                            >
                                                                ${s.outstanding.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {s.is_active ? (
                                                                <Badge tone="success">Active</Badge>
                                                            ) : (
                                                                <Badge tone="neutral">Inactive</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* MODAL: NEW PURCHASE ORDER */}
            <Modal
                show={orderModalOpen}
                maxWidth="lg"
                onClose={() => setOrderModalOpen(false)}
            >
                <form onSubmit={submitOrder} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Create Purchase Order
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Draft a requisition with quantities and agreed unit costs.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOrderModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Supplier */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Supplier <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={orderForm.data.supplier_id}
                                    onChange={(e) =>
                                        orderForm.setData('supplier_id', Number(e.target.value))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Branch */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Destination Branch <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={orderForm.data.branch_id}
                                    onChange={(e) =>
                                        orderForm.setData('branch_id', Number(e.target.value))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div>
                            <div className="flex items-center justify-between pb-1.5">
                                <label className="block text-xs font-semibold text-gray-800">
                                    Order Items
                                </label>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="text-xs font-semibold text-primary hover:text-primary/80"
                                >
                                    + Add Item Row
                                </button>
                            </div>

                            <div className="space-y-2">
                                {orderForm.data.items.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50/50 p-2"
                                    >
                                        <div className="flex-1">
                                            <select
                                                value={row.value}
                                                onChange={(e) => updateLineItem(idx, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                                required
                                            >
                                                <option value="">Select item…</option>
                                                {items.map((i) => (
                                                    <option key={i.value} value={i.value}>
                                                        {i.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-24">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                placeholder="Qty"
                                                value={row.quantity}
                                                onChange={(e) =>
                                                    updateLineQty(idx, Number(e.target.value))
                                                }
                                                className="block w-full rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-primary focus:ring-primary"
                                                required
                                            />
                                        </div>

                                        <div className="w-28">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Unit Cost ($)"
                                                value={row.unit_cost}
                                                onChange={(e) =>
                                                    updateLineCost(idx, Number(e.target.value))
                                                }
                                                className="block w-full rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-primary focus:ring-primary"
                                                required
                                            />
                                        </div>

                                        {orderForm.data.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLine(idx)}
                                                className="rounded p-1 text-gray-400 hover:text-rose-600"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Calculated Order Total */}
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3 text-xs">
                            <span className="font-semibold text-gray-700">Estimated PO Total:</span>
                            <span className="font-mono text-base font-bold text-gray-900">
                                ${calculatedOrderTotal.toFixed(2)}
                            </span>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Purchase Order Notes
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Delivery specifications, terms, or reference notes"
                                value={orderForm.data.notes}
                                onChange={(e) => orderForm.setData('notes', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setOrderModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={orderForm.processing}
                        >
                            Create Purchase Order
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: ADD SUPPLIER */}
            <Modal
                show={supplierModalOpen}
                maxWidth="sm"
                onClose={() => setSupplierModalOpen(false)}
            >
                <form onSubmit={submitSupplier} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Add New Supplier
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSupplierModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Supplier / Company Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Metro Produce Co."
                                value={supplierForm.data.name}
                                onChange={(e) => supplierForm.setData('name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {supplierForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{supplierForm.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Primary Contact Person
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. John Doe"
                                value={supplierForm.data.contact_name}
                                onChange={(e) => supplierForm.setData('contact_name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Contact Phone
                            </label>
                            <input
                                type="text"
                                placeholder="+1 (555) 000-0000"
                                value={supplierForm.data.phone}
                                onChange={(e) => supplierForm.setData('phone', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="orders@supplier.com"
                                value={supplierForm.data.email}
                                onChange={(e) => supplierForm.setData('email', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSupplierModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={supplierForm.processing}
                        >
                            Save Supplier
                        </Button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
