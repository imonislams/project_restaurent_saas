import Icon from '@/Components/Icon';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card, { CardBody } from '@/Components/ui/Card';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import EmptyState from '@/Components/ui/EmptyState';
import { SelectField, TextField } from '@/Components/ui/Field';
import KpiCard from '@/Components/ui/KpiCard';
import PageHeader from '@/Components/ui/PageHeader';
import { formatMoney } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface SessionInfo {
    id: number;
    status: string;
    orders_count: number;
    total: number;
}

interface TableRow {
    id: number;
    name: string;
    seats: number;
    status: string;
    is_active: boolean;
    area_name: string | null;
    qr_url: string;
    qr_active: boolean;
    scan_count: number;
    last_scanned_at: string | null;
    session: SessionInfo | null;
}

interface Option {
    id: number;
    name: string;
}

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
    available: 'success',
    occupied: 'warning',
    reserved: 'info',
    billing: 'info',
    cleaning: 'neutral',
};

export default function QrTablesIndex({
    tables,
    branches,
    areas,
    filters,
    stats,
}: {
    tables: TableRow[];
    branches: Option[];
    areas: Option[];
    filters: { branch_id: number | null; area_id: number | null; search: string };
    stats: { total: number; active: number; occupied: number };
}) {
    const { auth, flash, currency } = usePage().props as Record<string, any>;
    const canManage = auth?.permissions?.includes('qr.manage') ?? false;

    const [search, setSearch] = useState(filters.search ?? '');
    const [pendingRegenerate, setPendingRegenerate] = useState<TableRow | null>(null);
    const [pendingRevoke, setPendingRevoke] = useState<TableRow | null>(null);
    const [processing, setProcessing] = useState(false);

    const applyFilters = (overrides: Record<string, unknown> = {}) => {
        router.get(
            route('qr-dining.tables.index'),
            {
                branch_id: filters.branch_id,
                area_id: filters.area_id,
                search,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const regenerate = () => {
        if (!pendingRegenerate) return;
        setProcessing(true);
        router.post(
            route('qr-dining.tables.regenerate', pendingRegenerate.id),
            {},
            { preserveScroll: true, onFinish: () => { setProcessing(false); setPendingRegenerate(null); } },
        );
    };

    const revoke = () => {
        if (!pendingRevoke) return;
        setProcessing(true);
        router.post(
            route('qr-dining.tables.revoke', pendingRevoke.id),
            {},
            { preserveScroll: true, onFinish: () => { setProcessing(false); setPendingRevoke(null); } },
        );
    };

    const printUrl = route('qr-dining.tables.print', { branch_id: filters.branch_id ?? '' });

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Table QR Codes"
                    description="Give every table its own secure QR code. Customers scan it to open the branded menu and order — no app required."
                    actions={
                        <Button variant="secondary" external href={printUrl} icon={<Icon name="download" className="h-4 w-4" />}>
                            Print all
                        </Button>
                    }
                />
            }
        >
            <Head title="Table QR Codes" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <KpiCard label="Tables" value={stats.total} hint="In the selected branch" />
                        <KpiCard label="Active tables" value={stats.active} hint="Accepting orders" tone="success" />
                        <KpiCard label="Dining now" value={stats.occupied} hint="Tables with an open session" tone="warning" />
                    </div>

                    <Card>
                        <CardBody>
                            <div className="flex flex-wrap items-end gap-3">
                                <SelectField
                                    label="Branch"
                                    value={String(filters.branch_id ?? '')}
                                    options={[
                                        { value: '', label: 'All branches' },
                                        ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                                    ]}
                                    onChange={(v) => applyFilters({ branch_id: v || null, area_id: null })}
                                    className="w-48"
                                />
                                <SelectField
                                    label="Area"
                                    value={String(filters.area_id ?? '')}
                                    options={[
                                        { value: '', label: 'All areas' },
                                        ...areas.map((a) => ({ value: String(a.id), label: a.name })),
                                    ]}
                                    onChange={(v) => applyFilters({ area_id: v || null })}
                                    className="w-44"
                                />
                                <TextField
                                    label="Search"
                                    value={search}
                                    onChange={setSearch}
                                    onEnter={() => applyFilters()}
                                    placeholder="Table name"
                                    className="w-52"
                                />
                                <Button variant="secondary" onClick={() => applyFilters()}>
                                    Search
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {tables.length === 0 ? (
                        <Card>
                            <CardBody>
                                <EmptyState
                                    title="No tables found"
                                    description="Create tables under Tables & Floor, then generate their QR codes here."
                                />
                            </CardBody>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {tables.map((table) => (
                                <Card key={table.id}>
                                    <CardBody className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-gray-900">{table.name}</h3>
                                                    <Badge tone={statusTone[table.status] ?? 'neutral'}>{table.status}</Badge>
                                                </div>
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    {table.area_name ?? 'No area'} · {table.seats} seats
                                                </p>
                                            </div>
                                            {table.session ? (
                                                <Badge tone="warning">
                                                    {table.session.orders_count} order(s) · {formatMoney(table.session.total, currency)}
                                                </Badge>
                                            ) : (
                                                <Badge tone="neutral">Vacant</Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                                            <img
                                                src={route('qr-dining.tables.qr', { table: table.id, size: 160 })}
                                                alt={`QR code for ${table.name}`}
                                                className="h-24 w-24 rounded bg-white p-1 ring-1 ring-gray-200"
                                                loading="lazy"
                                            />
                                            <div className="min-w-0 text-xs text-gray-500">
                                                <p className="flex items-center gap-1">
                                                    <Icon name="activity" className="h-3.5 w-3.5" />
                                                    {table.scan_count} scan(s)
                                                </p>
                                                <p className="mt-1 truncate">
                                                    {table.last_scanned_at ? `Last ${table.last_scanned_at}` : 'Not scanned yet'}
                                                </p>
                                                {!table.qr_active && (
                                                    <p className="mt-1 font-semibold text-red-600">Revoked</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            <a
                                                href={table.qr_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                <Icon name="search" className="h-3.5 w-3.5" /> Preview
                                            </a>
                                            <a
                                                href={route('qr-dining.tables.qr', { table: table.id, download: 1 })}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                <Icon name="download" className="h-3.5 w-3.5" /> PNG
                                            </a>
                                            <a
                                                href={route('qr-dining.tables.qr', { table: table.id, format: 'svg', download: 1 })}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                SVG
                                            </a>
                                            <a
                                                href={route('qr-dining.tables.print', { table_ids: [table.id] })}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                Print card
                                            </a>
                                        </div>

                                        {canManage && (
                                            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                                                <Button variant="ghost" size="xs" onClick={() => setPendingRegenerate(table)}>
                                                    Regenerate
                                                </Button>
                                                <Button variant="ghost" size="xs" onClick={() => setPendingRevoke(table)}>
                                                    Revoke
                                                </Button>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                show={pendingRegenerate !== null}
                title="Regenerate QR code?"
                description={`The current QR code for ${pendingRegenerate?.name ?? ''} will stop working immediately and a new one will be issued.`}
                confirmLabel="Regenerate"
                tone="primary"
                processing={processing}
                onConfirm={regenerate}
                onClose={() => setPendingRegenerate(null)}
            />

            <ConfirmDialog
                show={pendingRevoke !== null}
                title="Revoke QR code?"
                description={`The QR code for ${pendingRevoke?.name ?? ''} will be disabled until you generate a new one.`}
                confirmLabel="Revoke"
                processing={processing}
                onConfirm={revoke}
                onClose={() => setPendingRevoke(null)}
            />
        </AuthenticatedLayout>
    );
}
