import BranchFields from '@/Components/Settings/BranchFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Drawer, EmptyState, PageHeader } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Building2, Plus, Store, Check, MapPin, Phone, Clock } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

interface BranchRow {
    id: number;
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    timezone: string;
    currency: string;
    service_types: string[];
    is_active: boolean;
    is_primary: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
    dine_in: 'Dine-in',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    counter: 'Counter',
};

export default function BranchesIndex({
    branches,
    limit,
    used,
    options,
}: {
    branches: BranchRow[];
    limit: number | null;
    used: number;
    options: SettingsOptions;
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('branches.manage');
    const atLimit = limit !== null && used >= limit;

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BranchRow | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'primary'; branch: BranchRow } | null>(null);

    const form = useForm({
        name: '',
        code: '',
        address: '',
        phone: '',
        timezone: '',
        currency: '',
        service_types: ['dine_in'] as string[],
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', code: '', address: '', phone: '', timezone: '', currency: '', service_types: ['dine_in'] });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (branch: BranchRow) => {
        setEditing(branch);
        form.setData({
            name: branch.name,
            code: branch.code ?? '',
            address: branch.address ?? '',
            phone: branch.phone ?? '',
            timezone: branch.timezone ?? '',
            currency: branch.currency ?? '',
            service_types: branch.service_types.length ? branch.service_types : ['dine_in'],
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => setOpen(false);
        if (editing) {
            form.patch(route('branches.update', editing.id), { preserveScroll: true, onSuccess });
        } else {
            form.post(route('branches.store'), { preserveScroll: true, onSuccess });
        }
    };

    const runAction = () => {
        if (!confirmAction) return;
        const { type, branch } = confirmAction;
        const url = type === 'primary' ? route('branches.primary', branch.id) : route('branches.deactivate', branch.id);
        router.post(url, {}, { preserveScroll: true, onFinish: () => setConfirmAction(null) });
    };

    const usagePct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Restaurant Branches"
                    description="Manage locations, physical addresses, operating hours, order routing, and localized accounts."
                    actions={
                        canManage && (
                            <Button
                                size="sm"
                                disabled={atLimit}
                                onClick={openCreate}
                                title={atLimit ? 'Plan branch limit reached' : undefined}
                                icon={<Plus className="h-4 w-4" />}
                            >
                                Add Branch
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Branches" />

            <div className="py-6">
                <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
                            {flash.error}
                        </div>
                    )}

                    <Card>
                        <CardBody className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold tracking-tight text-foreground">
                                        {used} of {limit ?? '∞'} locations configured
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Your current subscription sets the maximum branch capacity for this restaurant.
                                    </p>
                                </div>
                                {atLimit && (
                                    <div className="flex items-center gap-2">
                                        <Badge tone="warning">Limit Reached</Badge>
                                        <Button size="sm" variant="outline" href={route('subscription.index')}>
                                            Upgrade Plan
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {limit !== null && (
                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={cn('h-full rounded-full transition-all duration-300', atLimit ? 'bg-amber-500' : 'bg-primary')}
                                        style={{ width: `${usagePct}%` }}
                                    />
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {branches.length === 0 ? (
                        <Card>
                            <EmptyState
                                title="No branches created"
                                description="Add your first physical restaurant branch to start processing orders."
                                action={canManage && <Button size="sm" onClick={openCreate}>Add Branch</Button>}
                            />
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {branches.map((branch) => (
                                <Card key={branch.id} className="flex flex-col">
                                    <CardHeader
                                        title={
                                            <span className="flex items-center gap-2">
                                                <span>{branch.name}</span>
                                                {branch.is_primary && <Badge tone="info">Primary</Badge>}
                                                {!branch.is_active && <Badge tone="neutral">Inactive</Badge>}
                                            </span>
                                        }
                                        description={branch.code ? `Code: ${branch.code}` : undefined}
                                    />
                                    <CardBody className="flex-1 space-y-2.5 p-5 text-xs text-muted-foreground">
                                        <div className="flex items-start gap-2 text-foreground/80">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                            <span>{branch.address || 'No physical address configured'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" />
                                                {branch.timezone}
                                            </span>
                                            <span>·</span>
                                            <span className="font-mono">{branch.currency}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {branch.service_types.map((s) => (
                                                <span
                                                    key={s}
                                                    className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground/80"
                                                >
                                                    {SERVICE_LABELS[s] ?? s}
                                                </span>
                                            ))}
                                        </div>
                                    </CardBody>
                                    {canManage && (
                                        <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
                                            <Button size="xs" variant="outline" onClick={() => openEdit(branch)}>
                                                Edit
                                            </Button>
                                            {!branch.is_primary && branch.is_active && (
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => setConfirmAction({ type: 'primary', branch })}
                                                >
                                                    Set Primary
                                                </Button>
                                            )}
                                            {!branch.is_primary && branch.is_active && (
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    className="ml-auto text-destructive hover:bg-destructive/10"
                                                    onClick={() => setConfirmAction({ type: 'deactivate', branch })}
                                                >
                                                    Deactivate
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}

                    <p className="text-center text-xs text-muted-foreground">
                        Looking for tax or receipt customization for branches?{' '}
                        <Link href={route('settings.show', { group: 'branches' })} className="text-primary hover:underline underline-offset-4">
                            Open branch settings
                        </Link>
                    </p>
                </div>
            </div>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? `Edit ${editing.name}` : 'New Branch'}
                width="max-w-lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" loading={form.processing} onClick={submit}>
                            {editing ? 'Save Branch' : 'Create Branch'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <BranchFields data={form.data} setData={form.setData} errors={form.errors} options={options} />
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmAction !== null}
                title={confirmAction?.type === 'primary' ? `Make ${confirmAction?.branch.name} the primary branch?` : `Deactivate ${confirmAction?.branch.name}?`}
                description={confirmAction?.type === 'primary' ? 'The primary branch serves as the default location for online ordering and unassigned staff.' : 'A deactivated branch is hidden from POS selection but maintains historical sales and reports.'}
                confirmLabel={confirmAction?.type === 'primary' ? 'Set Primary' : 'Deactivate'}
                tone={confirmAction?.type === 'deactivate' ? 'danger' : 'primary'}
                onConfirm={runAction}
                onClose={() => setConfirmAction(null)}
            />
        </AuthenticatedLayout>
    );
}
