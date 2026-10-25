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
    Pagination,
    SelectField,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TextField,
    TextareaField,
} from '@/Components/ui';
import type { BadgeTone, PageLink } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Download, Plus, Users } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface CustomerRow {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    notes?: string | null;
    tags: string[];
    orders_count: number;
    orders_sum_total: number;
    points: number;
    segment: string | null;
    visits: number;
    is_active: boolean;
    is_marketing_opt_in: boolean;
}

interface Paginator {
    data: CustomerRow[];
    links: PageLink[];
    total: number;
    from: number | null;
    to: number | null;
}

interface SegmentSummary {
    total: number;
    spend: number;
    segments: { key: string; label: string; count: number; spend: number }[];
}

interface Filters {
    search: string;
    segment: string;
    status: string;
    points: string;
}

const SEGMENT_TONE: Record<string, BadgeTone> = {
    champions: 'success',
    loyal: 'info',
    high_value: 'success',
    new: 'info',
    regular: 'neutral',
    at_risk: 'warning',
    lost: 'danger',
};

const SEGMENT_LABEL: Record<string, string> = {
    champions: 'Champions',
    loyal: 'Loyal',
    high_value: 'High-value',
    new: 'New',
    regular: 'Regular',
    at_risk: 'At risk',
    lost: 'Lost',
};

const parseTags = (value: string): string[] =>
    value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

export default function CustomersIndex({
    customers,
    summary,
    metrics,
    segments,
    loyaltyEnabled,
    filters,
}: {
    customers: Paginator;
    summary: SegmentSummary;
    metrics: { total: number; active: number; points: number; spend: number; orders: number };
    segments: { value: string; label: string }[];
    loyaltyEnabled: boolean;
    filters: Filters;
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('customers.manage');

    const [search, setSearch] = useState(filters.search ?? '');
    const [customerDrawerMode, setCustomerDrawerMode] = useState<'create' | 'edit' | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
    const [pointsCustomer, setPointsCustomer] = useState<CustomerRow | null>(null);
    const [pendingDelete, setPendingDelete] = useState<CustomerRow | null>(null);

    const customerForm = useForm({
        name: '',
        phone: '',
        email: '',
        notes: '',
        tags: '',
        is_active: true,
        is_marketing_opt_in: true,
    });

    const pointsForm = useForm({ points: 50, reason: 'Loyalty bonus' });

    const applyFilters = (overrides: Partial<Filters>) => {
        const merged: Record<string, string> = { ...filters, ...overrides };
        const params: Record<string, string> = {};

        Object.entries(merged).forEach(([key, value]) => {
            if (value && value !== 'all') params[key] = String(value);
        });

        router.get(route('customers.index'), params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openCreateDrawer = () => {
        customerForm.reset();
        customerForm.setData({ name: '', phone: '', email: '', notes: '', tags: '', is_active: true, is_marketing_opt_in: true });
        customerForm.clearErrors();
        setSelectedCustomer(null);
        setCustomerDrawerMode('create');
    };

    const openEditDrawer = (customer: CustomerRow) => {
        customerForm.setData({
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            notes: customer.notes ?? '',
            tags: (customer.tags ?? []).join(', '),
            is_active: customer.is_active,
            is_marketing_opt_in: customer.is_marketing_opt_in,
        });
        customerForm.clearErrors();
        setSelectedCustomer(customer);
        setCustomerDrawerMode('edit');
    };

    const openPointsDrawer = (customer: CustomerRow) => {
        pointsForm.reset();
        pointsForm.setData({ points: 50, reason: 'Loyalty adjustment' });
        setPointsCustomer(customer);
    };

    const handleCustomerSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        customerForm.transform((data) => ({ ...data, tags: parseTags(data.tags) }));

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

    const rows = customers.data ?? [];

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Customers & CRM"
                    description="Guest directory, segmentation, lifetime spend and loyalty."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={loyaltyEnabled ? 'success' : 'neutral'}>{loyaltyEnabled ? 'Loyalty active' : 'Loyalty off'}</Badge>
                            <Button size="sm" variant="secondary" external href={route('customers.export', { segment: filters.segment || undefined })} icon={<Download className="h-3.5 w-3.5" />}>
                                Export
                            </Button>
                            {canManage && (
                                <Button size="sm" onClick={openCreateDrawer} icon={<Plus className="h-3.5 w-3.5" />}>
                                    Add customer
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
                    {flash?.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">{flash.error}</div>}

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <KpiCard label="Total customers" value={metrics.total} hint={`${metrics.active} active`} icon={<Users className="h-4 w-4" />} />
                        <KpiCard label="Lifetime spend" value={<Money amount={metrics.spend} />} hint={`${metrics.orders} orders`} />
                        <KpiCard label="Loyalty points" value={metrics.points.toLocaleString()} hint={loyaltyEnabled ? 'Circulating balance' : 'Program disabled'} tone={loyaltyEnabled ? 'warning' : 'neutral'} />
                        <KpiCard label="Repeat guests" value={summary.segments.reduce((acc, s) => acc + (['champions', 'loyal'].includes(s.key) ? s.count : 0), 0)} hint="Champions + loyal" tone="success" />
                    </div>

                    <Card>
                        <CardBody className="flex flex-wrap items-center gap-2 p-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Segments</span>
                            <Button size="xs" variant={filters.segment === '' ? 'primary' : 'secondary'} onClick={() => applyFilters({ segment: '' })}>
                                All ({summary.total})
                            </Button>
                            {summary.segments
                                .filter((s) => s.count > 0)
                                .map((s) => (
                                    <Button key={s.key} size="xs" variant={filters.segment === s.key ? 'primary' : 'secondary'} onClick={() => applyFilters({ segment: s.key })}>
                                        {s.label} ({s.count})
                                    </Button>
                                ))}
                            {summary.total === 0 && <span className="text-xs text-muted-foreground">Segments appear once customers place orders.</span>}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody className="p-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <TextField
                                    label="Search"
                                    value={search}
                                    placeholder="Name or phone…"
                                    onChange={setSearch}
                                    onEnter={() => applyFilters({ search })}
                                />
                                <SelectField
                                    label="Status"
                                    value={filters.status || 'all'}
                                    options={[
                                        { value: 'all', label: 'All statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                    ]}
                                    onChange={(v) => applyFilters({ status: v })}
                                />
                                <SelectField
                                    label="Segment"
                                    value={filters.segment || 'all'}
                                    options={[{ value: 'all', label: 'All segments' }, ...segments]}
                                    onChange={(v) => applyFilters({ segment: v === 'all' ? '' : v })}
                                />
                                <SelectField
                                    label="Loyalty balance"
                                    value={filters.points || 'all'}
                                    options={[
                                        { value: 'all', label: 'All balances' },
                                        { value: 'has', label: 'Has points' },
                                        { value: 'zero', label: 'No points' },
                                    ]}
                                    onChange={(v) => applyFilters({ points: v })}
                                />
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={`Customer directory (${customers.total})`} description="Profiles, contacts, visits, spend and loyalty balances." />
                        <CardBody className="p-0">
                            {rows.length === 0 ? (
                                <EmptyState
                                    title="No customers found"
                                    description={filters.search ? `No guest matching “${filters.search}”.` : 'Add your first customer to build guest relationships.'}
                                    action={canManage ? <Button size="sm" onClick={openCreateDrawer}>Add customer</Button> : undefined}
                                />
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="px-5 py-3">Customer</TableHead>
                                                    <TableHead className="px-5 py-3">Contact</TableHead>
                                                    <TableHead className="px-5 py-3 text-center">Orders & spend</TableHead>
                                                    <TableHead className="px-5 py-3 text-center">Segment</TableHead>
                                                    <TableHead className="px-5 py-3 text-right">Points</TableHead>
                                                    <TableHead className="px-5 py-3 text-center">Status</TableHead>
                                                    {canManage && <TableHead className="px-5 py-3 text-right">Actions</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.map((customer) => {
                                                    const initials = customer.name
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase();

                                                    return (
                                                        <TableRow key={customer.id} className="transition-colors hover:bg-muted/30">
                                                            <TableCell className="px-5 py-3.5">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-8 w-8 rounded-full border border-border">
                                                                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials || 'C'}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0">
                                                                        <Link href={route('customers.show', customer.id)} className="block truncate font-medium text-foreground hover:text-primary">
                                                                            {customer.name}
                                                                        </Link>
                                                                        {customer.tags && customer.tags.length > 0 ? (
                                                                            <div className="mt-0.5 flex flex-wrap gap-1">
                                                                                {customer.tags.slice(0, 3).map((tag) => (
                                                                                    <span key={tag} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-xs text-muted-foreground/60">Guest #{customer.id}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-3.5">
                                                                <div className="space-y-0.5 text-xs">
                                                                    {customer.phone ? <div className="text-foreground">{customer.phone}</div> : <span className="text-muted-foreground">No phone</span>}
                                                                    {customer.email && <div className="text-muted-foreground">{customer.email}</div>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-3.5 text-center text-xs">
                                                                <span className="font-semibold text-foreground">{customer.orders_count} order{customer.orders_count === 1 ? '' : 's'}</span>
                                                                <div className="text-muted-foreground"><Money amount={customer.orders_sum_total} /></div>
                                                            </TableCell>
                                                            <TableCell className="px-5 py-3.5 text-center">
                                                                {customer.segment ? (
                                                                    <Badge tone={SEGMENT_TONE[customer.segment] ?? 'neutral'}>{SEGMENT_LABEL[customer.segment] ?? customer.segment}</Badge>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-5 py-3.5 text-right text-xs">
                                                                {loyaltyEnabled ? (
                                                                    <span className="font-semibold tabular-nums text-foreground">{customer.points.toLocaleString()}<span className="ml-0.5 font-normal text-muted-foreground">pts</span></span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-5 py-3.5 text-center">
                                                                <Badge tone={customer.is_active ? 'success' : 'neutral'}>{customer.is_active ? 'Active' : 'Inactive'}</Badge>
                                                            </TableCell>
                                                            {canManage && (
                                                                <TableCell className="px-5 py-3.5 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        <Button size="xs" variant="secondary" href={route('customers.show', customer.id)}>View</Button>
                                                                        {loyaltyEnabled && (
                                                                            <Button size="xs" variant="ghost" className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-800" onClick={() => openPointsDrawer(customer)}>
                                                                                Points
                                                                            </Button>
                                                                        )}
                                                                        <Button size="xs" variant="ghost" onClick={() => openEditDrawer(customer)}>Edit</Button>
                                                                        <Button size="xs" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => setPendingDelete(customer)}>Delete</Button>
                                                                    </div>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-2">
                                        <span className="text-xs text-muted-foreground">
                                            {customers.from ?? 0}–{customers.to ?? 0} of {customers.total}
                                        </span>
                                        <Pagination links={customers.links} className="pt-0" />
                                    </div>
                                </>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            <Drawer
                show={customerDrawerMode !== null}
                onClose={() => setCustomerDrawerMode(null)}
                title={customerDrawerMode === 'create' ? 'Add customer' : `Edit — ${selectedCustomer?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setCustomerDrawerMode(null)}>Cancel</Button>
                        <Button loading={customerForm.processing} onClick={handleCustomerSubmit}>
                            {customerDrawerMode === 'create' ? 'Save customer' : 'Update profile'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    <TextField label="Full name" value={customerForm.data.name} placeholder="e.g. Sarah Jenkins" error={customerForm.errors.name} onChange={(v) => customerForm.setData('name', v)} />
                    <TextField label="Phone" type="tel" value={customerForm.data.phone} placeholder="+8801XXXXXXXXX" error={customerForm.errors.phone} onChange={(v) => customerForm.setData('phone', v)} />
                    <TextField label="Email" type="email" value={customerForm.data.email} placeholder="sarah@example.com" error={customerForm.errors.email} onChange={(v) => customerForm.setData('email', v)} />
                    <TextField label="Tags" value={customerForm.data.tags} placeholder="vip, weekend, allergies" hint="Comma-separated." error={customerForm.errors.tags} onChange={(v) => customerForm.setData('tags', v)} />
                    <TextareaField label="Notes" value={customerForm.data.notes} placeholder="Preferences, allergies, VIP status…" error={customerForm.errors.notes} onChange={(v) => customerForm.setData('notes', v)} />

                    <div className="space-y-3 border-t border-border/60 pt-3">
                        <label className="flex items-center justify-between gap-3">
                            <span className="text-sm text-foreground">Active account</span>
                            <Switch checked={customerForm.data.is_active} onCheckedChange={(v) => customerForm.setData('is_active', v)} />
                        </label>
                        <label className="flex items-center justify-between gap-3">
                            <span className="text-sm text-foreground">Marketing opt-in</span>
                            <Switch checked={customerForm.data.is_marketing_opt_in} onCheckedChange={(v) => customerForm.setData('is_marketing_opt_in', v)} />
                        </label>
                    </div>
                </form>
            </Drawer>

            <Drawer
                show={pointsCustomer !== null}
                onClose={() => setPointsCustomer(null)}
                title={`Adjust points — ${pointsCustomer?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setPointsCustomer(null)}>Cancel</Button>
                        <Button loading={pointsForm.processing} onClick={handlePointsSubmit}>Apply points</Button>
                    </div>
                }
            >
                {pointsCustomer && (
                    <div className="space-y-5">
                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Current balance</span>
                            <p className="text-2xl font-bold tabular-nums text-amber-900">{pointsCustomer.points.toLocaleString()} pts</p>
                        </div>

                        <div>
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick presets</span>
                            <div className="grid grid-cols-3 gap-2">
                                {[50, 100, 250, 500, -50, -100].map((value) => (
                                    <Button key={value} size="xs" variant={pointsForm.data.points === value ? 'primary' : 'secondary'} onClick={() => pointsForm.setData('points', value)}>
                                        {value > 0 ? `+${value}` : value}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <TextField label="Points delta (+/-)" type="number" value={String(pointsForm.data.points)} error={pointsForm.errors.points} onChange={(v) => pointsForm.setData('points', Number(v))} />
                        <TextField label="Reason" value={pointsForm.data.reason} placeholder="Birthday reward, correction…" error={pointsForm.errors.reason} onChange={(v) => pointsForm.setData('reason', v)} />
                    </div>
                )}
            </Drawer>

            <ConfirmDialog
                show={pendingDelete !== null}
                title={`Remove ${pendingDelete?.name ?? 'customer'}?`}
                description="This removes the guest record from your directory. Past orders are preserved."
                confirmLabel="Remove customer"
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('customers.destroy', pendingDelete.id), { preserveScroll: true, onFinish: () => setPendingDelete(null) });
                    }
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
