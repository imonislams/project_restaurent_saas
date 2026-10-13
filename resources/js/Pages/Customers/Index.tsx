import {
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    ConfirmDialog,
    Drawer,
    EmptyState,
    KpiCard,
    Money,
    PageHeader,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TextField,
    TextareaField,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';

interface CustomerRow {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    notes?: string | null;
    orders_count?: number;
    orders_sum_total?: number;
    points: number;
    is_active: boolean;
}

export default function CustomersIndex({
    customers,
    loyaltyEnabled,
    filters,
}: {
    customers: CustomerRow[];
    loyaltyEnabled: boolean;
    filters: { search: string };
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('customers.manage');

    // Search and filter states
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [pointsFilter, setPointsFilter] = useState<'all' | 'has_points' | 'zero'>('all');

    // Drawer / Modal states
    const [customerDrawerMode, setCustomerDrawerMode] = useState<'create' | 'edit' | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
    const [pointsCustomer, setPointsCustomer] = useState<CustomerRow | null>(null);
    const [pendingDelete, setPendingDelete] = useState<CustomerRow | null>(null);

    // Form for Create / Edit Customer
    const customerForm = useForm({
        name: '',
        phone: '',
        email: '',
        notes: '',
        is_active: true,
    });

    // Form for Adjust Points
    const pointsForm = useForm({
        points: 50,
        reason: 'Loyalty bonus',
    });

    const openCreateDrawer = () => {
        customerForm.reset();
        customerForm.setData({
            name: '',
            phone: '',
            email: '',
            notes: '',
            is_active: true,
        });
        setSelectedCustomer(null);
        setCustomerDrawerMode('create');
    };

    const openEditDrawer = (customer: CustomerRow) => {
        customerForm.setData({
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            notes: customer.notes ?? '',
            is_active: customer.is_active,
        });
        setSelectedCustomer(customer);
        setCustomerDrawerMode('edit');
    };

    const openPointsDrawer = (customer: CustomerRow) => {
        pointsForm.reset();
        pointsForm.setData({
            points: 50,
            reason: 'Loyalty adjustment',
        });
        setPointsCustomer(customer);
    };

    const handleCustomerSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (customerDrawerMode === 'create') {
            customerForm.post(route('customers.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    customerForm.reset();
                    setCustomerDrawerMode(null);
                },
            });
        } else if (customerDrawerMode === 'edit' && selectedCustomer) {
            customerForm.patch(route('customers.update', selectedCustomer.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setCustomerDrawerMode(null);
                    setSelectedCustomer(null);
                },
            });
        }
    };

    const handlePointsSubmit = () => {
        if (!pointsCustomer) return;
        pointsForm.post(route('customers.points', pointsCustomer.id), {
            preserveScroll: true,
            onSuccess: () => {
                pointsForm.reset();
                setPointsCustomer(null);
            },
        });
    };

    const triggerSearch = () => {
        router.get(
            route('customers.index'),
            { search },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = customers.length;
        const active = customers.filter((c) => c.is_active).length;
        const totalPoints = customers.reduce((acc, c) => acc + (c.points || 0), 0);
        const totalSpend = customers.reduce((acc, c) => acc + (c.orders_sum_total || 0), 0);
        const totalOrders = customers.reduce((acc, c) => acc + (c.orders_count || 0), 0);

        return {
            total,
            active,
            totalPoints,
            totalSpend,
            totalOrders,
        };
    }, [customers]);

    // Filter customers
    const filteredCustomers = useMemo(() => {
        return customers.filter((c) => {
            if (statusFilter === 'active' && !c.is_active) return false;
            if (statusFilter === 'inactive' && c.is_active) return false;

            if (pointsFilter === 'has_points' && (!c.points || c.points <= 0)) return false;
            if (pointsFilter === 'zero' && c.points > 0) return false;

            return true;
        });
    }, [customers, statusFilter, pointsFilter]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Customer CRM & Loyalty"
                    description="Guest directory, dining history, lifetime spend, and loyalty rewards."
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {loyaltyEnabled ? (
                                <Badge tone="success">Loyalty Active</Badge>
                            ) : (
                                <Badge tone="neutral">Loyalty Disabled</Badge>
                            )}

                            {canManage && (
                                <Button size="sm" onClick={openCreateDrawer}>
                                    + Add Customer
                                </Button>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Customers & CRM" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            <span className="text-emerald-600">✓</span>
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                            <span className="text-rose-600">✕</span>
                            {flash.error}
                        </div>
                    )}

                    {/* CRM KPI Metrics */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label="Total Customers"
                            value={metrics.total}
                            hint={`${metrics.active} active guest accounts`}
                        />
                        <KpiCard
                            label="Active Members"
                            value={metrics.active}
                            hint="Verified & active guests"
                            tone="success"
                        />
                        <KpiCard
                            label="Loyalty Points Circulation"
                            value={metrics.totalPoints.toLocaleString()}
                            hint={loyaltyEnabled ? 'Across all member balances' : 'Program currently disabled'}
                            tone={loyaltyEnabled ? 'warning' : 'neutral'}
                        />
                        <KpiCard
                            label="Guest Lifetime Spend"
                            value={<Money amount={metrics.totalSpend} />}
                            hint={`${metrics.totalOrders} recorded orders`}
                        />
                    </div>

                    {/* Filter and Search Bar */}
                    <Card>
                        <CardBody className="p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                {/* Search */}
                                <div className="flex w-full max-w-md items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or phone number..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
                                            className="h-9 w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                        {search && (
                                            <button
                                                onClick={() => {
                                                    setSearch('');
                                                    router.get(
                                                        route('customers.index'),
                                                        {},
                                                        { preserveState: true, replace: true },
                                                    );
                                                }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={triggerSearch}>
                                        Search
                                    </Button>
                                </div>

                                {/* Status Filters */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs font-medium">
                                        <button
                                            onClick={() => setStatusFilter('all')}
                                            className={`rounded-sm px-2.5 py-1 transition cursor-pointer ${
                                                statusFilter === 'all'
                                                    ? 'bg-background text-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            All Status
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter('active')}
                                            className={`rounded-sm px-2.5 py-1 transition cursor-pointer ${
                                                statusFilter === 'active'
                                                    ? 'bg-background text-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Active
                                        </button>
                                        <button
                                            onClick={() => setStatusFilter('inactive')}
                                            className={`rounded-sm px-2.5 py-1 transition cursor-pointer ${
                                                statusFilter === 'inactive'
                                                    ? 'bg-background text-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Inactive
                                        </button>
                                    </div>

                                    {loyaltyEnabled && (
                                        <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs font-medium">
                                            <button
                                                onClick={() => setPointsFilter('all')}
                                                className={`rounded-sm px-2.5 py-1 transition cursor-pointer ${
                                                    pointsFilter === 'all'
                                                    ? 'bg-background text-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                All Points
                                            </button>
                                            <button
                                                onClick={() => setPointsFilter('has_points')}
                                                className={`rounded-sm px-2.5 py-1 transition cursor-pointer ${
                                                    pointsFilter === 'has_points'
                                                    ? 'bg-background text-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                Has Balance
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Customer Roster Table */}
                    <Card>
                        <CardHeader
                            title={`Customer Directory (${filteredCustomers.length} guests)`}
                            description="Profiles, contacts, visit frequencies, and loyalty reward balances."
                        />
                        <CardBody className="p-0">
                            {filteredCustomers.length === 0 ? (
                                <EmptyState
                                    title="No customers found"
                                    description={
                                        search
                                            ? `No guest found matching "${search}".`
                                            : 'Add your first customer to build guest relationships and loyalty.'
                                    }
                                    action={
                                        canManage ? (
                                            <Button size="sm" onClick={openCreateDrawer}>
                                                Add Customer
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="px-5 py-3">Customer Profile</TableHead>
                                                <TableHead className="px-5 py-3">Contact Details</TableHead>
                                                <TableHead className="px-5 py-3 text-center">Visits & Spend</TableHead>
                                                <TableHead className="px-5 py-3 text-right">Loyalty Points</TableHead>
                                                <TableHead className="px-5 py-3 text-center">Status</TableHead>
                                                {canManage && <TableHead className="px-5 py-3 text-right">Actions</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCustomers.map((customer) => {
                                                const initials = customer.name
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase();

                                                return (
                                                    <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                                                        {/* Profile */}
                                                        <TableCell className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8 rounded-full border border-border">
                                                                    <AvatarFallback className="bg-primary/10 font-semibold text-primary text-xs">
                                                                        {initials || 'C'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-semibold text-foreground">
                                                                        {customer.name}
                                                                    </div>
                                                                    {customer.notes ? (
                                                                        <div className="max-w-xs truncate text-xs text-muted-foreground">
                                                                            {customer.notes}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-muted-foreground/60">
                                                                            Guest ID #{customer.id}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Contact */}
                                                        <TableCell className="px-5 py-3.5">
                                                            <div className="space-y-0.5 text-xs">
                                                                {customer.phone ? (
                                                                    <div className="text-foreground">
                                                                        {customer.phone}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground">No phone</span>
                                                                )}
                                                                {customer.email && (
                                                                    <div className="text-muted-foreground">
                                                                        {customer.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Visits & Spend */}
                                                        <TableCell className="px-5 py-3.5 text-center">
                                                            <div className="text-xs">
                                                                <span className="font-semibold text-foreground">
                                                                    {customer.orders_count ?? 0} visit
                                                                    {(customer.orders_count ?? 0) === 1 ? '' : 's'}
                                                                </span>
                                                                <div className="text-muted-foreground">
                                                                    <Money amount={customer.orders_sum_total ?? 0} />
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Loyalty Points */}
                                                        <TableCell className="px-5 py-3.5 text-right">
                                                            {loyaltyEnabled ? (
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <span className="font-semibold tabular-nums text-foreground">
                                                                        {customer.points.toLocaleString()}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">pts</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell className="px-5 py-3.5 text-center">
                                                            <Badge tone={customer.is_active ? 'success' : 'neutral'}>
                                                                {customer.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        {canManage && (
                                                            <TableCell className="px-5 py-3.5 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {loyaltyEnabled && (
                                                                        <Button
                                                                            size="xs"
                                                                            variant="ghost"
                                                                            onClick={() => openPointsDrawer(customer)}
                                                                            className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-800"
                                                                        >
                                                                            Points
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        size="xs"
                                                                        variant="outline"
                                                                        onClick={() => openEditDrawer(customer)}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        onClick={() => setPendingDelete(customer)}
                                                                        className="text-rose-600 hover:text-rose-700"
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Create / Edit Customer Drawer */}
            <Drawer
                show={customerDrawerMode !== null}
                onClose={() => setCustomerDrawerMode(null)}
                title={
                    customerDrawerMode === 'create'
                        ? 'Add Customer'
                        : `Edit Customer — ${selectedCustomer?.name ?? ''}`
                }
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setCustomerDrawerMode(null)}>
                            Cancel
                        </Button>
                        <Button loading={customerForm.processing} onClick={handleCustomerSubmit}>
                            {customerDrawerMode === 'create' ? 'Save Customer' : 'Update Profile'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    <TextField
                        label="Full Name *"
                        placeholder="e.g. Sarah Jenkins"
                        value={customerForm.data.name}
                        error={customerForm.errors.name}
                        onChange={(v) => customerForm.setData('name', v)}
                    />

                    <TextField
                        label="Phone Number"
                        type="tel"
                        placeholder="e.g. +1 (555) 234-5678"
                        value={customerForm.data.phone}
                        error={customerForm.errors.phone}
                        onChange={(v) => customerForm.setData('phone', v)}
                    />

                    <TextField
                        label="Email Address"
                        type="email"
                        placeholder="e.g. sarah@example.com"
                        value={customerForm.data.email}
                        error={customerForm.errors.email}
                        onChange={(v) => customerForm.setData('email', v)}
                    />

                    <TextareaField
                        label="Guest Notes & Preferences"
                        placeholder="e.g. Table preference: booth; Allergies: shellfish; VIP member."
                        value={customerForm.data.notes}
                        error={customerForm.errors.notes}
                        onChange={(v) => customerForm.setData('notes', v)}
                    />

                    <div className="pt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={customerForm.data.is_active}
                                onChange={(e) => customerForm.setData('is_active', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Active account</span>
                        </label>
                    </div>
                </form>
            </Drawer>

            {/* Adjust Loyalty Points Drawer */}
            <Drawer
                show={pointsCustomer !== null}
                onClose={() => setPointsCustomer(null)}
                title={`Adjust Points — ${pointsCustomer?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setPointsCustomer(null)}>
                            Cancel
                        </Button>
                        <Button
                            loading={pointsForm.processing}
                            onClick={handlePointsSubmit}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Apply Points
                        </Button>
                    </div>
                }
            >
                {pointsCustomer && (
                    <div className="space-y-5">
                        {/* Current Balance Card */}
                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                                        Current Balance
                                    </span>
                                    <p className="text-2xl font-black tabular-nums text-amber-900">
                                        {pointsCustomer.points.toLocaleString()} pts
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-amber-700">Projected Balance:</span>
                                    <p className="text-sm font-bold tabular-nums text-amber-900">
                                        {Math.max(0, pointsCustomer.points + (pointsForm.data.points || 0)).toLocaleString()}{' '}
                                        pts
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                                Quick Presets
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: '+50 pts', val: 50 },
                                    { label: '+100 pts', val: 100 },
                                    { label: '+250 pts', val: 250 },
                                    { label: '+500 pts', val: 500 },
                                    { label: '-50 pts', val: -50 },
                                    { label: '-100 pts', val: -100 },
                                ].map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => pointsForm.setData('points', preset.val)}
                                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                            pointsForm.data.points === preset.val
                                                ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manual Input */}
                        <TextField
                            label="Points Delta (+/-) *"
                            type="number"
                            placeholder="e.g. 100 or -50"
                            value={String(pointsForm.data.points)}
                            error={pointsForm.errors.points}
                            onChange={(v) => pointsForm.setData('points', Number(v))}
                        />

                        <TextField
                            label="Reason for Adjustment *"
                            placeholder="e.g. Birthday reward, apology credit, manual correction"
                            value={pointsForm.data.reason}
                            error={pointsForm.errors.reason}
                            onChange={(v) => pointsForm.setData('reason', v)}
                        />
                    </div>
                )}
            </Drawer>

            {/* Confirm Delete Customer Dialog */}
            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Remove ${pendingDelete?.name ?? 'customer'}?`}
                description="This will remove the guest record from your active directory. Previous orders associated with this customer will be preserved."
                confirmLabel="Remove Customer"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('customers.destroy', pendingDelete.id), {
                            preserveScroll: true,
                            onFinish: () => {
                                setPendingDelete(null);
                            },
                        });
                    }
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
