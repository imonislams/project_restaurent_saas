import BranchFields from '@/Components/Settings/BranchFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Drawer, EmptyState, PageHeader } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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
                    title="Branches"
                    description="Manage every restaurant location. Each branch gets its own stock location and cash account."
                    actions={
                        canManage && (
                            <Button size="sm" disabled={atLimit} onClick={openCreate} title={atLimit ? 'Plan branch limit reached' : undefined}>
                                Add branch
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Branches" />

            <div className="py-6">
                <div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    <Card>
                        <CardBody>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-800">
                                        {used} of {limit ?? '∞'} branches used
                                    </div>
                                    <p className="text-xs text-gray-500">Your plan sets how many locations you can run.</p>
                                </div>
                                {atLimit && (
                                    <div className="flex items-center gap-2">
                                        <Badge tone="warning">Plan limit reached</Badge>
                                        <Button size="sm" variant="secondary" href={route('subscription.index')}>Upgrade plan</Button>
                                    </div>
                                )}
                            </div>
                            {limit !== null && (
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div className={'h-full rounded-full ' + (atLimit ? 'bg-amber-500' : 'bg-indigo-600')} style={{ width: `${usagePct}%` }} />
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {branches.length === 0 ? (
                        <Card>
                            <EmptyState title="No branches yet" description="Add your first branch to start selling." action={canManage && <Button size="sm" onClick={openCreate}>Add branch</Button>} />
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {branches.map((branch) => (
                                <Card key={branch.id} className="flex flex-col">
                                    <CardHeader
                                        title={
                                            <span className="flex items-center gap-2">
                                                {branch.name}
                                                {branch.is_primary && <Badge tone="info">Primary</Badge>}
                                                {!branch.is_active && <Badge tone="neutral">Inactive</Badge>}
                                            </span>
                                        }
                                        description={branch.code ?? undefined}
                                    />
                                    <CardBody className="flex-1 space-y-2 text-sm text-gray-600">
                                        <div>{branch.address ?? '—'}</div>
                                        <div className="text-xs text-gray-400">{branch.timezone} · {branch.currency}</div>
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {branch.service_types.map((s) => (
                                                <span key={s} className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-inset ring-gray-200">{SERVICE_LABELS[s] ?? s}</span>
                                            ))}
                                        </div>
                                    </CardBody>
                                    {canManage && (
                                        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
                                            <Button size="sm" variant="secondary" onClick={() => openEdit(branch)}>Edit</Button>
                                            {!branch.is_primary && branch.is_active && (
                                                <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'primary', branch })}>Set primary</Button>
                                            )}
                                            {!branch.is_primary && branch.is_active && (
                                                <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:bg-red-50" onClick={() => setConfirmAction({ type: 'deactivate', branch })}>Deactivate</Button>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}

                    <p className="text-center text-xs text-gray-400">
                        Need to change your primary branch details? <Link href={route('settings.show', { group: 'branches' })} className="text-indigo-600 hover:text-indigo-700">Open settings</Link>
                    </p>
                </div>
            </div>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? `Edit ${editing.name}` : 'New branch'}
                width="max-w-lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button loading={form.processing} onClick={submit}>{editing ? 'Save branch' : 'Create branch'}</Button>
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
                description={confirmAction?.type === 'primary' ? 'The primary branch is used as the tenant default.' : 'A deactivated branch is hidden from selection but keeps its data.'}
                confirmLabel={confirmAction?.type === 'primary' ? 'Set primary' : 'Deactivate'}
                tone={confirmAction?.type === 'deactivate' ? 'danger' : 'primary'}
                onConfirm={runAction}
                onClose={() => setConfirmAction(null)}
            />
        </AuthenticatedLayout>
    );
}
