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
    PageHeader,
    TextField,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

interface StaffMember {
    id: number;
    name: string;
    email: string;
    status: string;
    is_active: boolean;
    is_self: boolean;
    last_login_at: string | null;
    roles: string[];
    role_labels: string[];
    branch_ids: number[];
    branch_names: string[];
    has_pin: boolean;
}

interface InvitationRow {
    id: number;
    email: string;
    name: string | null;
    roles: string[];
    branch_ids: number[];
    expires_at: string;
}

function MultiCheck({
    options,
    selected,
    onToggle,
}: {
    options: { value: string; label: string }[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map((opt) => (
                <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition ${
                        selected.includes(opt.value)
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-xs focus:ring-indigo-500"
                        checked={selected.includes(opt.value)}
                        onChange={() => onToggle(opt.value)}
                    />
                    <span>{opt.label}</span>
                </label>
            ))}
        </div>
    );
}

export default function StaffIndex({
    staff,
    invitations,
    roles,
    branches,
}: {
    staff: StaffMember[];
    invitations: InvitationRow[];
    roles: { value: string; label: string }[];
    branches: { id: number; name: string }[];
}) {
    const { flash, auth } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('staff.manage');

    const [showInviteDrawer, setShowInviteDrawer] = useState(false);
    const [editing, setEditing] = useState<StaffMember | null>(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState<StaffMember | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');

    const inviteForm = useForm({
        name: '',
        email: '',
        roles: ['cashier'] as string[],
        branch_ids: [] as number[],
    });

    const editForm = useForm({
        roles: [] as string[],
        branch_ids: [] as number[],
    });

    const toggle = (list: string[], value: string, setter: (v: string[]) => void) =>
        setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

    const toggleBranch = (list: number[], value: number, setter: (v: number[]) => void) =>
        setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

    const submitInvite: FormEventHandler = (e) => {
        e.preventDefault();
        inviteForm.post(route('staff.store'), {
            preserveScroll: true,
            onSuccess: () => {
                inviteForm.reset();
                setShowInviteDrawer(false);
            },
        });
    };

    const openEdit = (member: StaffMember) => {
        setEditing(member);
        editForm.setData({
            roles: member.roles,
            branch_ids: member.branch_ids,
        });
        editForm.clearErrors();
    };

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editing) return;
        editForm.patch(route('staff.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const postAction = (routeName: string, member: StaffMember) =>
        router.post(route(routeName, member.id), {}, { preserveScroll: true });

    // Metrics
    const metrics = useMemo(() => {
        const total = staff.length;
        const active = staff.filter((s) => s.is_active).length;
        const pending = invitations.length;
        const multiBranch = staff.filter((s) => s.branch_ids.length > 1 || s.branch_ids.length === 0).length;

        return { total, active, pending, multiBranch };
    }, [staff, invitations]);

    // Filter staff
    const filteredStaff = useMemo(() => {
        return staff.filter((s) => {
            if (search.trim()) {
                const q = search.toLowerCase();
                const matchName = s.name.toLowerCase().includes(q);
                const matchEmail = s.email.toLowerCase().includes(q);
                const matchRole = s.role_labels.some((r) => r.toLowerCase().includes(q));
                if (!matchName && !matchEmail && !matchRole) return false;
            }

            if (statusFilter === 'active' && !s.is_active) return false;
            if (statusFilter === 'deactivated' && s.is_active) return false;

            return true;
        });
    }, [staff, search, statusFilter]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Staff & Permissions"
                    description="Team directory, role privileges, multi-branch assignments, and manager security."
                    actions={
                        canManage && (
                            <Button size="sm" onClick={() => setShowInviteDrawer(true)}>
                                + Invite Team Member
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Staff & Permissions" />

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

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label="Total Team"
                            value={metrics.total}
                            hint={`${metrics.active} active members`}
                        />
                        <KpiCard
                            label="Active Staff"
                            value={metrics.active}
                            hint="Granted portal access"
                            tone="success"
                        />
                        <KpiCard
                            label="Pending Invites"
                            value={metrics.pending}
                            hint="Awaiting member sign up"
                            tone={metrics.pending > 0 ? 'warning' : 'neutral'}
                        />
                        <KpiCard
                            label="Multi-Branch Staff"
                            value={metrics.multiBranch}
                            hint="Access across multiple locations"
                        />
                    </div>

                    {/* Pending Invitations Banner (if any) */}
                    {invitations.length > 0 && (
                        <Card>
                            <CardHeader
                                title={`Pending Invitations (${invitations.length})`}
                                description="Team members invited who have not yet claimed their account."
                            />
                            <CardBody className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-amber-50/50 text-xs font-semibold uppercase tracking-wider text-amber-800">
                                            <tr>
                                                <th className="px-5 py-3">Invitee Email</th>
                                                <th className="px-5 py-3">Designated Roles</th>
                                                <th className="px-5 py-3">Invitation Expires</th>
                                                {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {invitations.map((inv) => (
                                                <tr key={inv.id} className="hover:bg-gray-50/60">
                                                    <td className="px-5 py-3 font-medium text-gray-800">
                                                        {inv.email}
                                                        {inv.name && (
                                                            <span className="ml-2 text-xs text-gray-500">
                                                                ({inv.name})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">
                                                        <div className="flex flex-wrap gap-1">
                                                            {inv.roles.map((r) => (
                                                                <span
                                                                    key={r}
                                                                    className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                                                                >
                                                                    {r}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-xs text-gray-500">
                                                        {new Date(inv.expires_at).toLocaleDateString()}
                                                    </td>
                                                    {canManage && (
                                                        <td className="px-5 py-3 text-right">
                                                            <div className="flex justify-end gap-2 text-xs">
                                                                <Button
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        router.post(
                                                                            route('staff.invitations.resend', inv.id),
                                                                            {},
                                                                            { preserveScroll: true },
                                                                        )
                                                                    }
                                                                >
                                                                    Resend Email
                                                                </Button>
                                                                <Button
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        router.delete(
                                                                            route('staff.invitations.destroy', inv.id),
                                                                            { preserveScroll: true },
                                                                        )
                                                                    }
                                                                    className="text-rose-600 hover:text-rose-700"
                                                                >
                                                                    Revoke
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Filter and Search Bar */}
                    <Card>
                        <CardBody className="p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full max-w-sm">
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or role..."
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

                                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-semibold">
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={`rounded-md px-3 py-1 transition ${
                                            statusFilter === 'all'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        All Team ({staff.length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('active')}
                                        className={`rounded-md px-3 py-1 transition ${
                                            statusFilter === 'active'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Active ({staff.filter((s) => s.is_active).length})
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('deactivated')}
                                        className={`rounded-md px-3 py-1 transition ${
                                            statusFilter === 'deactivated'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Deactivated ({staff.filter((s) => !s.is_active).length})
                                    </button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Team Members Roster */}
                    <Card>
                        <CardHeader
                            title={`Team Members (${filteredStaff.length})`}
                            description="Active staff members, assigned operational roles, and security credentials."
                        />
                        <CardBody className="p-0">
                            {filteredStaff.length === 0 ? (
                                <EmptyState
                                    title="No team members found"
                                    description="No team members matched your search criteria."
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <tr>
                                                <th className="px-5 py-3.5">Member Name</th>
                                                <th className="px-5 py-3.5">Assigned Roles</th>
                                                <th className="px-5 py-3.5">Branch Coverage</th>
                                                <th className="px-5 py-3.5 text-center">Status</th>
                                                <th className="px-5 py-3.5">Last Login</th>
                                                {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredStaff.map((member) => {
                                                const initials = member.name
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase();

                                                return (
                                                    <tr key={member.id} className="hover:bg-gray-50/80">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                                                                    {initials || 'U'}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                                                        {member.name}
                                                                        {member.is_self && (
                                                                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                        {member.has_pin && (
                                                                            <span
                                                                                title="Manager PIN configured"
                                                                                className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                                                                            >
                                                                                PIN
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {member.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-wrap gap-1">
                                                                {member.role_labels.length > 0 ? (
                                                                    member.role_labels.map((rl) => (
                                                                        <span
                                                                            key={rl}
                                                                            className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                                                        >
                                                                            {rl}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">—</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5 text-xs text-gray-600">
                                                            {member.branch_names.length > 0 ? (
                                                                member.branch_names.join(', ')
                                                            ) : (
                                                                <span className="font-medium text-indigo-600">
                                                                    All Branches
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-3.5 text-center">
                                                            <Badge tone={member.is_active ? 'success' : 'neutral'}>
                                                                {member.is_active ? 'Active' : 'Deactivated'}
                                                            </Badge>
                                                        </td>

                                                        <td className="px-5 py-3.5 text-xs text-gray-500">
                                                            {member.last_login_at
                                                                ? new Date(member.last_login_at).toLocaleDateString()
                                                                : 'Never logged in'}
                                                        </td>

                                                        {canManage && (
                                                            <td className="px-5 py-3.5 text-right">
                                                                <div className="flex items-center justify-end gap-1.5 text-xs">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        onClick={() => openEdit(member)}
                                                                    >
                                                                        Edit Access
                                                                    </Button>

                                                                    {member.is_active ? (
                                                                        !member.is_self && (
                                                                            <Button
                                                                                size="xs"
                                                                                variant="ghost"
                                                                                onClick={() =>
                                                                                    setConfirmDeactivate(member)
                                                                                }
                                                                                className="text-rose-600 hover:text-rose-700"
                                                                            >
                                                                                Deactivate
                                                                            </Button>
                                                                        )
                                                                    ) : (
                                                                        <Button
                                                                            size="xs"
                                                                            variant="ghost"
                                                                            onClick={() =>
                                                                                postAction('staff.reactivate', member)
                                                                            }
                                                                            className="text-emerald-600 hover:text-emerald-700"
                                                                        >
                                                                            Reactivate
                                                                        </Button>
                                                                    )}

                                                                    <Button
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        onClick={() =>
                                                                            postAction('staff.revoke-sessions', member)
                                                                        }
                                                                        title="Revoke active sessions"
                                                                    >
                                                                        Revoke Sessions
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Invite Staff Drawer */}
            <Drawer
                show={showInviteDrawer}
                onClose={() => setShowInviteDrawer(false)}
                title="Invite Team Member"
                width="max-w-lg"
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setShowInviteDrawer(false)}>
                            Cancel
                        </Button>
                        <Button loading={inviteForm.processing} onClick={submitInvite}>
                            Send Invitation
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitInvite} className="space-y-4">
                    <TextField
                        label="Full Name (optional)"
                        placeholder="e.g. John Doe"
                        value={inviteForm.data.name}
                        error={inviteForm.errors.name}
                        onChange={(v) => inviteForm.setData('name', v)}
                    />

                    <TextField
                        label="Email Address *"
                        type="email"
                        placeholder="e.g. john@restaurant.com"
                        value={inviteForm.data.email}
                        error={inviteForm.errors.email}
                        onChange={(v) => inviteForm.setData('email', v)}
                    />

                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                            Roles & Privileges *
                        </label>
                        <MultiCheck
                            options={roles}
                            selected={inviteForm.data.roles}
                            onToggle={(v) =>
                                toggle(inviteForm.data.roles, v, (r) => inviteForm.setData('roles', r))
                            }
                        />
                        {inviteForm.errors.roles && (
                            <p className="mt-1 text-xs text-rose-600">{inviteForm.errors.roles}</p>
                        )}
                    </div>

                    {branches.length > 0 && (
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                                Branch Access (Leave empty for All Branches)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {branches.map((b) => (
                                    <label
                                        key={b.id}
                                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition ${
                                            inviteForm.data.branch_ids.includes(b.id)
                                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 shadow-xs focus:ring-indigo-500"
                                            checked={inviteForm.data.branch_ids.includes(b.id)}
                                            onChange={() =>
                                                toggleBranch(inviteForm.data.branch_ids, b.id, (ids) =>
                                                    inviteForm.setData('branch_ids', ids),
                                                )
                                            }
                                        />
                                        <span>{b.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </form>
            </Drawer>

            {/* Edit Access Drawer */}
            <Drawer
                show={editing !== null}
                onClose={() => setEditing(null)}
                title={`Edit Access — ${editing?.name ?? ''}`}
                width="max-w-lg"
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                        </Button>
                        <Button loading={editForm.processing} onClick={submitEdit}>
                            Save Changes
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitEdit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                            Roles & Privileges
                        </label>
                        <MultiCheck
                            options={roles}
                            selected={editForm.data.roles}
                            onToggle={(v) => toggle(editForm.data.roles, v, (r) => editForm.setData('roles', r))}
                        />
                        {editForm.errors.roles && (
                            <p className="mt-1 text-xs text-rose-600">{editForm.errors.roles}</p>
                        )}
                    </div>

                    {branches.length > 0 && (
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700">
                                Branch Access (Leave empty for All Branches)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {branches.map((b) => (
                                    <label
                                        key={b.id}
                                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition ${
                                            editForm.data.branch_ids.includes(b.id)
                                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs'
                                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 shadow-xs focus:ring-indigo-500"
                                            checked={editForm.data.branch_ids.includes(b.id)}
                                            onChange={() =>
                                                toggleBranch(editForm.data.branch_ids, b.id, (ids) =>
                                                    editForm.setData('branch_ids', ids),
                                                )
                                            }
                                        />
                                        <span>{b.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </form>
            </Drawer>

            {/* Confirm Deactivation Dialog */}
            <ConfirmDialog
                show={confirmDeactivate !== null}
                title={`Deactivate ${confirmDeactivate?.name ?? 'staff member'}?`}
                description="This staff member will immediately lose access to the portal and POS terminal. You can reactivate their account anytime."
                confirmLabel="Deactivate Account"
                tone="danger"
                onConfirm={() => {
                    if (confirmDeactivate) {
                        postAction('staff.deactivate', confirmDeactivate);
                        setConfirmDeactivate(null);
                    }
                }}
                onClose={() => setConfirmDeactivate(null)}
            />
        </AuthenticatedLayout>
    );
}
