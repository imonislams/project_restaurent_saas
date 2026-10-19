import {
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
    SelectField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TextField,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BranchSummary } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { LayoutGrid, List, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';

interface OpenOrder {
    id: number;
    order_number: string;
    total: number;
    created_at?: string;
}

interface TableRow {
    id: number;
    name: string;
    seats: number;
    status: string;
    dining_area: string | null;
    dining_area_id?: number | null;
    sort_order?: number;
    is_active?: boolean;
    open_orders: OpenOrder[];
}

const STATUS_CONFIG: Record<
    string,
    {
        label: string;
        tone: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
        bg: string;
        border: string;
        badgeTone: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
    }
> = {
    available: {
        label: 'Available',
        tone: 'success',
        bg: 'bg-emerald-50/60 hover:bg-emerald-50',
        border: 'border-emerald-200',
        badgeTone: 'success',
    },
    occupied: {
        label: 'Occupied',
        tone: 'danger',
        bg: 'bg-rose-50/60 hover:bg-rose-50',
        border: 'border-rose-200',
        badgeTone: 'danger',
    },
    reserved: {
        label: 'Reserved',
        tone: 'warning',
        bg: 'bg-amber-50/60 hover:bg-amber-50',
        border: 'border-amber-200',
        badgeTone: 'warning',
    },
    billing: {
        label: 'Billing',
        tone: 'info',
        bg: 'bg-indigo-50/60 hover:bg-indigo-50',
        border: 'border-indigo-200',
        badgeTone: 'info',
    },
    cleaning: {
        label: 'Cleaning',
        tone: 'neutral',
        bg: 'bg-slate-50/70 hover:bg-slate-100/70',
        border: 'border-slate-200',
        badgeTone: 'neutral',
    },
};

export default function TablesIndex({
    branches,
    branchId,
    areas,
    tables,
    statuses,
}: {
    branches: BranchSummary[];
    branchId: number | null;
    areas: { id: number; name: string }[];
    tables: TableRow[];
    statuses: { value: string; label: string }[];
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('tables.manage');

    // UI View states
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    // Drawer / Modal states
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
    const [activeTable, setActiveTable] = useState<TableRow | null>(null);
    const [pendingDelete, setPendingDelete] = useState<TableRow | null>(null);
    const [transferOrder, setTransferOrder] = useState<number | ''>('');

    // Form for Create / Edit
    const form = useForm({
        branch_id: branchId ?? (branches[0]?.id || ('' as number | '')),
        dining_area_id: '' as number | '',
        name: '',
        seats: 4,
        sort_order: 0,
        is_active: true,
    });

    const openCreateDrawer = () => {
        form.reset();
        form.setData({
            branch_id: branchId ?? (branches[0]?.id || ('' as number | '')),
            dining_area_id: '',
            name: '',
            seats: 4,
            sort_order: 0,
            is_active: true,
        });
        setDrawerMode('create');
    };

    const openEditDrawer = (table: TableRow) => {
        form.setData({
            branch_id: branchId ?? (branches[0]?.id || ('' as number | '')),
            dining_area_id: table.dining_area_id ?? '',
            name: table.name,
            seats: table.seats,
            sort_order: table.sort_order ?? 0,
            is_active: table.is_active ?? true,
        });
        setActiveTable(table);
        setDrawerMode('edit');
    };

    const handleFormSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (drawerMode === 'create') {
            form.post(route('tables.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setDrawerMode(null);
                },
            });
        } else if (drawerMode === 'edit' && activeTable) {
            form.patch(route('tables.update', activeTable.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDrawerMode(null);
                    setActiveTable(null);
                },
            });
        }
    };

    const setStatus = (table: TableRow, status: string) => {
        router.patch(route('tables.status', table.id), { status }, { preserveScroll: true });
        if (activeTable?.id === table.id) {
            setActiveTable({ ...activeTable, status });
        }
    };

    const transfer = (table: TableRow) => {
        if (!transferOrder) return;
        router.post(
            route('tables.transfer'),
            { order_id: transferOrder, table_id: table.id },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTransferOrder('');
                    setActiveTable(null);
                },
            },
        );
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        const totalTables = tables.length;
        const totalSeats = tables.reduce((acc, t) => acc + (t.seats || 0), 0);
        const available = tables.filter((t) => t.status === 'available').length;
        const occupied = tables.filter((t) => t.status === 'occupied').length;
        const billing = tables.filter((t) => t.status === 'billing').length;
        const cleaning = tables.filter((t) => t.status === 'cleaning').length;
        const reserved = tables.filter((t) => t.status === 'reserved').length;

        const openOrdersCount = tables.reduce((acc, t) => acc + t.open_orders.length, 0);
        const openOrdersTotal = tables.reduce(
            (acc, t) => acc + t.open_orders.reduce((oAcc, o) => oAcc + o.total, 0),
            0,
        );

        const occupancyRate = totalTables > 0 ? Math.round((occupied / totalTables) * 100) : 0;

        return {
            totalTables,
            totalSeats,
            available,
            occupied,
            billing,
            cleaning,
            reserved,
            occupancyRate,
            openOrdersCount,
            openOrdersTotal,
        };
    }, [tables]);

    // Filter tables
    const filteredTables = useMemo(() => {
        return tables.filter((table) => {
            if (search.trim()) {
                const query = search.toLowerCase();
                const matchesName = table.name.toLowerCase().includes(query);
                const matchesArea = table.dining_area?.toLowerCase().includes(query) ?? false;
                if (!matchesName && !matchesArea) return false;
            }

            if (selectedArea !== 'all') {
                if (selectedArea === 'none' && table.dining_area) return false;
                if (selectedArea !== 'none' && table.dining_area !== selectedArea) return false;
            }

            if (selectedStatus !== 'all' && table.status !== selectedStatus) {
                return false;
            }

            return true;
        });
    }, [tables, search, selectedArea, selectedStatus]);

    // Group tables by dining area for grid view
    const groupedTables = useMemo(() => {
        const groups: Record<string, TableRow[]> = {};

        filteredTables.forEach((table) => {
            const areaName = table.dining_area || 'General Floor';
            if (!groups[areaName]) {
                groups[areaName] = [];
            }
            groups[areaName].push(table);
        });

        return groups;
    }, [filteredTables]);

    // Candidate open orders available for transfer
    const transferableOrders = useMemo(() => {
        return tables
            .flatMap((t) => t.open_orders.map((o) => ({ ...o, fromTableName: t.name, tableId: t.id })))
            .filter((o) => o.tableId !== activeTable?.id);
    }, [tables, activeTable]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Tables & Floor Plan"
                    description="Real-time dining room layout, table occupancy, and order allocation."
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {branches.length > 1 && (
                                <select
                                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                    value={branchId ?? ''}
                                    onChange={(e) =>
                                        router.post(
                                            route('branch.switch'),
                                            { branch_id: Number(e.target.value) },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                        viewMode === 'grid'
                                            ? 'bg-background text-foreground shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    Floor Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                        viewMode === 'list'
                                            ? 'bg-background text-foreground shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <List className="h-3.5 w-3.5" />
                                    List View
                                </button>
                            </div>

                            {canManage && (
                                <Button size="sm" onClick={openCreateDrawer}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add Table
                                </Button>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Tables & Floor Plan" />

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

                    {/* Operational KPIs */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <KpiCard
                            label="Total Tables"
                            value={metrics.totalTables}
                            hint={`${metrics.totalSeats} seats total capacity`}
                        />
                        <KpiCard
                            label="Available Now"
                            value={metrics.available}
                            hint="Ready for immediate seating"
                            tone="success"
                        />
                        <KpiCard
                            label="Occupied"
                            value={`${metrics.occupied} (${metrics.occupancyRate}%)`}
                            hint={`${metrics.openOrdersCount} active dine-in orders`}
                            tone={metrics.occupancyRate > 70 ? 'danger' : 'neutral'}
                        />
                        <KpiCard
                            label="Turnaround"
                            value={metrics.billing + metrics.cleaning}
                            hint={`${metrics.billing} billing · ${metrics.cleaning} cleaning`}
                            tone={metrics.billing + metrics.cleaning > 0 ? 'warning' : 'neutral'}
                        />
                        <KpiCard
                            label="Active Tabs Pipeline"
                            value={<Money amount={metrics.openOrdersTotal} />}
                            hint={`${metrics.openOrdersCount} unsettled tabs`}
                        />
                    </div>

                    {/* Filter and Area Bar */}
                    <Card>
                        <CardBody className="p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                {/* Search */}
                                <div className="relative w-full max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search tables or areas..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-sm"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Area Filter Tabs */}
                                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
                                    <button
                                        onClick={() => setSelectedArea('all')}
                                        className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                            selectedArea === 'all'
                                                ? 'bg-foreground text-background shadow-xs font-semibold'
                                                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        All Areas ({tables.length})
                                    </button>
                                    {areas.map((area) => {
                                        const count = tables.filter((t) => t.dining_area === area.name).length;
                                        return (
                                            <button
                                                key={area.id}
                                                onClick={() => setSelectedArea(area.name)}
                                                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                                    selectedArea === area.name
                                                        ? 'bg-foreground text-background shadow-xs font-semibold'
                                                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {area.name} ({count})
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Status Filter Pills */}
                                <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                                    <button
                                        onClick={() => setSelectedStatus('all')}
                                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                            selectedStatus === 'all'
                                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {statuses.map((s) => {
                                        const count = tables.filter((t) => t.status === s.value).length;
                                        return (
                                            <button
                                                key={s.value}
                                                onClick={() => setSelectedStatus(s.value)}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                                    selectedStatus === s.value
                                                        ? 'bg-background text-foreground shadow-xs font-semibold'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {s.label} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* View Mode: Floor Grid */}
                    {viewMode === 'grid' && (
                        <div className="space-y-8">
                            {Object.keys(groupedTables).length === 0 ? (
                                <Card>
                                    <CardBody>
                                        <EmptyState
                                            title="No tables found"
                                            description="No tables match your selected search or filters."
                                            action={
                                                canManage ? (
                                                    <Button size="sm" onClick={openCreateDrawer}>
                                                        Add Table
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    </CardBody>
                                </Card>
                            ) : (
                                Object.entries(groupedTables).map(([areaName, areaTables]) => (
                                    <div key={areaName} className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                                                    {areaName}
                                                </h3>
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                    {areaTables.length} tables ·{' '}
                                                    {areaTables.reduce((acc, t) => acc + t.seats, 0)} seats
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    {areaTables.filter((t) => t.status === 'available').length} free
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                    {areaTables.filter((t) => t.status === 'occupied').length} busy
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                            {areaTables.map((table) => {
                                                const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
                                                const totalBalance = table.open_orders.reduce(
                                                    (acc, o) => acc + o.total,
                                                    0,
                                                );

                                                return (
                                                    <div
                                                        key={table.id}
                                                        className={`group relative flex flex-col justify-between rounded-lg border p-4 shadow-xs transition hover:shadow-sm ${config.border} ${config.bg}`}
                                                    >
                                                        <div>
                                                            {/* Table Card Top */}
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <button
                                                                        onClick={() => setActiveTable(table)}
                                                                        className="text-left font-semibold text-foreground hover:text-primary transition-colors"
                                                                    >
                                                                        <span className="text-base">{table.name}</span>
                                                                    </button>
                                                                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                        <Users className="h-3 w-3" />
                                                                        <span className="tabular-nums">{table.seats} seats</span>
                                                                    </div>
                                                                </div>
                                                                <Badge tone={config.badgeTone}>{config.label}</Badge>
                                                            </div>

                                                            {/* Active Open Orders Section */}
                                                            {table.open_orders.length > 0 ? (
                                                                <div className="mt-3.5 space-y-1.5 rounded-md border border-rose-200/60 bg-background/80 p-2.5">
                                                                    <div className="flex items-center justify-between text-xs font-semibold text-rose-900">
                                                                        <span>Active Tab</span>
                                                                        <span className="font-semibold tabular-nums">
                                                                            <Money amount={totalBalance} />
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {table.open_orders.map((order) => (
                                                                            <div
                                                                                key={order.id}
                                                                                className="flex items-center justify-between text-xs text-muted-foreground"
                                                                            >
                                                                                <button
                                                                                    onClick={() =>
                                                                                        router.get(
                                                                                            route(
                                                                                                'orders.show',
                                                                                                order.id,
                                                                                            ),
                                                                                        )
                                                                                    }
                                                                                    className="font-medium text-primary hover:underline"
                                                                                >
                                                                                    {order.order_number}
                                                                                </button>
                                                                                <span className="tabular-nums font-medium text-foreground">
                                                                                    <Money amount={order.total} />
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-3.5 flex items-center gap-1.5 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                                                                    <span>No active orders</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Table Card Bottom Actions */}
                                                        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5">
                                                            <button
                                                                onClick={() => setActiveTable(table)}
                                                                className="text-xs font-medium text-primary hover:underline"
                                                            >
                                                                Details & Status
                                                            </button>

                                                            {canManage && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => openEditDrawer(table)}
                                                                        title="Edit Table"
                                                                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    {table.open_orders.length === 0 && (
                                                                        <button
                                                                            onClick={() => setPendingDelete(table)}
                                                                            title="Remove Table"
                                                                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* View Mode: List View */}
                    {viewMode === 'list' && (
                        <Card>
                            <CardHeader
                                title={`Table Directory (${filteredTables.length} tables)`}
                                description="Comprehensive roster of tables, seating capacities, and active floor sessions."
                            />
                            <CardBody className="p-0">
                                {filteredTables.length === 0 ? (
                                    <EmptyState
                                        title="No tables found"
                                        description="No tables match your selected criteria."
                                    />
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Table Name</TableHead>
                                                <TableHead>Dining Area</TableHead>
                                                <TableHead className="text-center">Capacity</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Active Tab</TableHead>
                                                {canManage && (
                                                    <TableHead className="text-right">Actions</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTables.map((table) => {
                                                const config =
                                                    STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
                                                const totalBalance = table.open_orders.reduce(
                                                    (acc, o) => acc + o.total,
                                                    0,
                                                );

                                                return (
                                                    <TableRow key={table.id}>
                                                        <TableCell>
                                                            <button
                                                                onClick={() => setActiveTable(table)}
                                                                className="font-medium text-foreground hover:text-primary transition-colors text-left"
                                                            >
                                                                {table.name}
                                                            </button>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {table.dining_area || (
                                                                <span className="text-muted-foreground/60">
                                                                    General Floor
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center tabular-nums text-foreground">
                                                            {table.seats} seats
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge tone={config.badgeTone}>{config.label}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {table.open_orders.length > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 tabular-nums">
                                                                        <Money amount={totalBalance} />
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ({table.open_orders.length} order
                                                                        {table.open_orders.length > 1 ? 's' : ''})
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground/60">—</span>
                                                            )}
                                                        </TableCell>
                                                        {canManage && (
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => setActiveTable(table)}
                                                                    >
                                                                        Manage
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => openEditDrawer(table)}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    {table.open_orders.length === 0 && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => setPendingDelete(table)}
                                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        >
                                                                            Delete
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create / Edit Table Drawer */}
            <Drawer
                show={drawerMode !== null}
                onClose={() => setDrawerMode(null)}
                title={drawerMode === 'create' ? 'Add New Table' : `Edit Table — ${activeTable?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setDrawerMode(null)}>
                            Cancel
                        </Button>
                        <Button loading={form.processing} onClick={handleFormSubmit}>
                            {drawerMode === 'create' ? 'Create Table' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <TextField
                        label="Table Name / Identifier *"
                        placeholder="e.g. T-1, Booth 4, Patio 2"
                        value={form.data.name}
                        error={form.errors.name}
                        onChange={(v) => form.setData('name', v)}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <TextField
                            label="Seat Capacity *"
                            type="number"
                            value={String(form.data.seats)}
                            error={form.errors.seats}
                            onChange={(v) => form.setData('seats', Number(v))}
                        />
                        <TextField
                            label="Sort Order"
                            type="number"
                            value={String(form.data.sort_order)}
                            error={form.errors.sort_order}
                            onChange={(v) => form.setData('sort_order', Number(v))}
                        />
                    </div>

                    <SelectField
                        label="Dining Area"
                        value={form.data.dining_area_id ? String(form.data.dining_area_id) : ''}
                        error={form.errors.dining_area_id}
                        onChange={(v) => form.setData('dining_area_id', v ? Number(v) : '')}
                        options={[
                            { value: '', label: 'General / No Area' },
                            ...areas.map((a) => ({ value: String(a.id), label: a.name })),
                        ]}
                    />

                    {branches.length > 1 && (
                        <SelectField
                            label="Branch"
                            value={String(form.data.branch_id)}
                            error={form.errors.branch_id}
                            onChange={(v) => form.setData('branch_id', Number(v))}
                            options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                        />
                    )}
                </form>
            </Drawer>

            {/* Table Details & Operations Drawer */}
            <Drawer
                show={activeTable !== null && drawerMode === null}
                onClose={() => {
                    setActiveTable(null);
                    setTransferOrder('');
                }}
                title={
                    activeTable ? (
                        <div className="flex items-center gap-2">
                            <span>Table {activeTable.name}</span>
                            <Badge tone={STATUS_CONFIG[activeTable.status]?.badgeTone ?? 'neutral'}>
                                {STATUS_CONFIG[activeTable.status]?.label ?? activeTable.status}
                            </Badge>
                        </div>
                    ) : (
                        'Table Details'
                    )
                }
                footer={
                    <div className="flex items-center justify-between">
                        {canManage && activeTable && activeTable.open_orders.length === 0 ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setPendingDelete(activeTable);
                                }}
                                className="text-rose-600 hover:text-rose-700"
                            >
                                Remove Table
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setActiveTable(null);
                                setTransferOrder('');
                            }}
                        >
                            Close
                        </Button>
                    </div>
                }
            >
                {activeTable && (
                    <div className="space-y-6">
                        {/* Summary Info */}
                        <div className="rounded-lg bg-gray-50 p-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-gray-500">Dining Area:</span>
                                    <p className="font-semibold text-gray-900">
                                        {activeTable.dining_area || 'General Floor'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Seating Capacity:</span>
                                    <p className="font-semibold text-gray-900">{activeTable.seats} Seats</p>
                                </div>
                            </div>
                        </div>

                        {/* Set Status Controls */}
                        {canManage && (
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                                    Set Table Status
                                </label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {statuses.map((s) => {
                                        const isCurrent = activeTable.status === s.value;
                                        return (
                                            <button
                                                key={s.value}
                                                onClick={() => setStatus(activeTable, s.value)}
                                                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                                    isCurrent
                                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Open Orders Section */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    Open Orders & Tabs ({activeTable.open_orders.length})
                                </label>
                                {activeTable.open_orders.length > 0 && (
                                    <span className="font-bold text-gray-900">
                                        Total:{' '}
                                        <Money
                                            amount={activeTable.open_orders.reduce((acc, o) => acc + o.total, 0)}
                                        />
                                    </span>
                                )}
                            </div>

                            {activeTable.open_orders.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">
                                    No open orders on this table. Available for guests.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {activeTable.open_orders.map((o) => (
                                        <div
                                            key={o.id}
                                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-xs"
                                        >
                                            <div>
                                                <button
                                                    onClick={() => router.get(route('orders.show', o.id))}
                                                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                                >
                                                    {o.order_number}
                                                </button>
                                                <p className="text-xs text-gray-500">Dine-in guest ticket</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold tabular-nums text-gray-900">
                                                    <Money amount={o.total} />
                                                </p>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => router.get(route('orders.show', o.id))}
                                                >
                                                    View & Settle →
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Order Transfer Section */}
                        {canManage && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-900">
                                    Transfer Order to this Table
                                </h4>
                                <p className="mt-1 text-xs text-gray-500">
                                    Select an open order from another table in the restaurant to move here.
                                </p>

                                {transferableOrders.length === 0 ? (
                                    <p className="mt-2 text-xs italic text-gray-400">
                                        No open orders on other tables to transfer.
                                    </p>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        <select
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            value={transferOrder}
                                            onChange={(e) => setTransferOrder(Number(e.target.value))}
                                        >
                                            <option value="">Select order to move…</option>
                                            {transferableOrders.map((o) => (
                                                <option key={o.id} value={o.id}>
                                                    {o.order_number} (From {o.fromTableName} · ${o.total.toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={!transferOrder}
                                            onClick={() => transfer(activeTable)}
                                            className="w-full"
                                        >
                                            Move Order Here
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Edit Button in Drawer */}
                        {canManage && (
                            <div className="pt-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        openEditDrawer(activeTable);
                                    }}
                                    className="w-full"
                                >
                                    Edit Table Configuration
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Remove ${pendingDelete?.name ?? 'table'}?`}
                description="This will remove the table from the floor layout. A table with active open orders cannot be removed."
                confirmLabel="Remove Table"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('tables.destroy', pendingDelete.id), {
                            preserveScroll: true,
                            onFinish: () => {
                                setPendingDelete(null);
                                setActiveTable(null);
                            },
                        });
                    }
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
