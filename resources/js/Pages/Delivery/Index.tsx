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
    TextField,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

interface ZoneRow {
    id: number;
    name: string;
    branch: string | null;
    branch_id?: number | null;
    fee: number;
    min_order: number;
    is_active: boolean;
}

export default function DeliveryIndex({
    branches,
    zones,
}: {
    branches: { id: number; name: string }[];
    zones: ZoneRow[];
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('settings.manage');

    const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
    const [selectedZone, setSelectedZone] = useState<ZoneRow | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ZoneRow | null>(null);
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');

    const form = useForm({
        branch_id: '' as number | '',
        name: '',
        fee: 0,
        min_order: 0,
        is_active: true,
    });

    const openCreateDrawer = () => {
        form.reset();
        form.setData({
            branch_id: '',
            name: '',
            fee: 0,
            min_order: 0,
            is_active: true,
        });
        setSelectedZone(null);
        setDrawerMode('create');
    };

    const openEditDrawer = (zone: ZoneRow) => {
        form.setData({
            branch_id: zone.branch_id ?? '',
            name: zone.name,
            fee: zone.fee,
            min_order: zone.min_order,
            is_active: zone.is_active,
        });
        setSelectedZone(zone);
        setDrawerMode('edit');
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (drawerMode === 'create') {
            form.post(route('delivery-zones.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setDrawerMode(null);
                },
            });
        } else if (drawerMode === 'edit' && selectedZone) {
            form.patch(route('delivery-zones.update', selectedZone.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDrawerMode(null);
                    setSelectedZone(null);
                },
            });
        }
    };

    // Metrics
    const metrics = useMemo(() => {
        const total = zones.length;
        const active = zones.filter((z) => z.is_active).length;
        const avgFee = total > 0 ? zones.reduce((acc, z) => acc + z.fee, 0) / total : 0;
        const avgMinOrder = total > 0 ? zones.reduce((acc, z) => acc + z.min_order, 0) / total : 0;

        return { total, active, avgFee, avgMinOrder };
    }, [zones]);

    // Filter zones
    const filteredZones = useMemo(() => {
        return zones.filter((z) => {
            if (search.trim()) {
                const q = search.toLowerCase();
                const matchName = z.name.toLowerCase().includes(q);
                const matchBranch = z.branch?.toLowerCase().includes(q) ?? false;
                if (!matchName && !matchBranch) return false;
            }

            if (selectedBranch !== 'all') {
                if (selectedBranch === 'all_branches' && z.branch !== null) return false;
                if (selectedBranch !== 'all_branches' && z.branch !== selectedBranch) return false;
            }

            return true;
        });
    }, [zones, search, selectedBranch]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Delivery Zones"
                    description="Configure geographical delivery perimeters, order delivery fees, and order minimums."
                    actions={
                        canManage && (
                            <Button size="sm" onClick={openCreateDrawer}>
                                + Add Delivery Zone
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Delivery Zones" />

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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label="Configured Zones"
                            value={metrics.total}
                            hint={`${metrics.active} actively servicing orders`}
                        />
                        <KpiCard
                            label="Active Dispatch Zones"
                            value={metrics.active}
                            hint="Available at POS checkout"
                            tone="success"
                        />
                        <KpiCard
                            label="Average Delivery Fee"
                            value={<Money amount={metrics.avgFee} />}
                            hint="Applied on order total"
                        />
                        <KpiCard
                            label="Average Minimum Order"
                            value={<Money amount={metrics.avgMinOrder} />}
                            hint="Cart threshold required"
                        />
                    </div>

                    {/* Filter Bar */}
                    <Card>
                        <CardBody className="p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full max-w-sm">
                                    <input
                                        type="text"
                                        placeholder="Search zones or branches..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {branches.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            onClick={() => setSelectedBranch('all')}
                                            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                                selectedBranch === 'all'
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            All Branches ({zones.length})
                                        </button>
                                        {branches.map((b) => (
                                            <button
                                                key={b.id}
                                                onClick={() => setSelectedBranch(b.name)}
                                                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                                    selectedBranch === b.name
                                                        ? 'bg-gray-900 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {b.name} ({zones.filter((z) => z.branch === b.name).length})
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Delivery Zones Table */}
                    <Card>
                        <CardHeader
                            title={`Delivery Coverage (${filteredZones.length} zones)`}
                            description="Perimeters and surcharges applied during customer delivery ordering."
                        />
                        <CardBody className="p-0">
                            {filteredZones.length === 0 ? (
                                <EmptyState
                                    title="No delivery zones configured"
                                    description={
                                        search
                                            ? `No zones match "${search}".`
                                            : 'Add your first delivery zone to enable delivery sales in POS.'
                                    }
                                    action={
                                        canManage ? (
                                            <Button size="sm" onClick={openCreateDrawer}>
                                                Add Delivery Zone
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <tr>
                                                <th className="px-5 py-3.5">Zone Name</th>
                                                <th className="px-5 py-3.5">Assigned Branch</th>
                                                <th className="px-5 py-3.5 text-right">Delivery Fee</th>
                                                <th className="px-5 py-3.5 text-right">Minimum Order</th>
                                                <th className="px-5 py-3.5 text-center">Status</th>
                                                {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredZones.map((zone) => (
                                                <tr key={zone.id} className="hover:bg-gray-50/80">
                                                    <td className="px-5 py-3.5 font-bold text-gray-900">
                                                        {zone.name}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-600">
                                                        {zone.branch ? (
                                                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                                {zone.branch}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-medium text-indigo-600">
                                                                All Branches
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-gray-900">
                                                        <Money amount={zone.fee} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-600">
                                                        <Money amount={zone.min_order} />
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <Badge tone={zone.is_active ? 'success' : 'neutral'}>
                                                            {zone.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    {canManage && (
                                                        <td className="px-5 py-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1.5 text-xs">
                                                                <Button
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={() => openEditDrawer(zone)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={() => setPendingDelete(zone)}
                                                                    className="text-rose-600 hover:text-rose-700"
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Create / Edit Zone Drawer */}
            <Drawer
                show={drawerMode !== null}
                onClose={() => setDrawerMode(null)}
                title={drawerMode === 'create' ? 'Add Delivery Zone' : `Edit Zone — ${selectedZone?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setDrawerMode(null)}>
                            Cancel
                        </Button>
                        <Button loading={form.processing} onClick={handleSubmit}>
                            {drawerMode === 'create' ? 'Create Zone' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <TextField
                        label="Zone Name *"
                        placeholder="e.g. Zone A (Downtown / Within 5km)"
                        value={form.data.name}
                        error={form.errors.name}
                        onChange={(v) => form.setData('name', v)}
                    />

                    {branches.length > 0 && (
                        <SelectField
                            label="Branch Scope"
                            value={form.data.branch_id === '' ? '' : String(form.data.branch_id)}
                            error={form.errors.branch_id}
                            options={[
                                { value: '', label: 'All Branches' },
                                ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                            ]}
                            onChange={(v) => form.setData('branch_id', v ? Number(v) : '')}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <TextField
                            label="Delivery Fee *"
                            type="number"
                            value={String(form.data.fee)}
                            error={form.errors.fee}
                            onChange={(v) => form.setData('fee', Number(v))}
                        />
                        <TextField
                            label="Min Order Amount *"
                            type="number"
                            value={String(form.data.min_order)}
                            error={form.errors.min_order}
                            onChange={(v) => form.setData('min_order', Number(v))}
                        />
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(e) => form.setData('is_active', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Active delivery zone</span>
                        </label>
                    </div>
                </form>
            </Drawer>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Remove ${pendingDelete?.name ?? 'delivery zone'}?`}
                description="This delivery zone will no longer be available for selection during order checkout."
                confirmLabel="Remove Zone"
                tone="danger"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('delivery-zones.destroy', pendingDelete.id), {
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
