import { Badge, Button, PageHeader } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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

interface Option {
    value?: string;
    label: string;
    id?: number;
    name?: string;
}

const fieldClass =
    'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

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
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                >
                    <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                        checked={selected.includes(opt.value)}
                        onChange={() => onToggle(opt.value)}
                    />
                    {opt.label}
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
    const { flash, auth } = usePage().props;
    const canManage = auth.permissions.includes('staff.manage');

    const [showInvite, setShowInvite] = useState(false);
    const [editing, setEditing] = useState<StaffMember | null>(null);

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

    const toggle = (
        list: string[],
        value: string,
        setter: (v: string[]) => void,
    ) =>
        setter(
            list.includes(value)
                ? list.filter((v) => v !== value)
                : [...list, value],
        );

    const toggleBranch = (
        list: number[],
        value: number,
        setter: (v: number[]) => void,
    ) =>
        setter(
            list.includes(value)
                ? list.filter((v) => v !== value)
                : [...list, value],
        );

    const submitInvite: FormEventHandler = (e) => {
        e.preventDefault();
        inviteForm.post(route('staff.store'), {
            preserveScroll: true,
            onSuccess: () => {
                inviteForm.reset();
                setShowInvite(false);
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

    const post = (routeName: string, member: StaffMember) =>
        router.post(route(routeName, member.id), {}, { preserveScroll: true });

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Staff & permissions"
                    description="Invite your team and control what each person can access."
                    actions={
                        canManage && (
                            <Button size="sm" onClick={() => setShowInvite((v) => !v)}>
                                {showInvite ? 'Close' : 'Invite staff'}
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Staff" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}

                    {showInvite && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-base font-semibold text-gray-900">
                                Invite a team member
                            </h3>
                            <form onSubmit={submitInvite} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-sm text-gray-700">
                                            Name (optional)
                                        </label>
                                        <input
                                            type="text"
                                            className={`mt-1 block w-full ${fieldClass}`}
                                            value={inviteForm.data.name}
                                            onChange={(e) =>
                                                inviteForm.setData(
                                                    'name',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            className={`mt-1 block w-full ${fieldClass}`}
                                            value={inviteForm.data.email}
                                            onChange={(e) =>
                                                inviteForm.setData(
                                                    'email',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                        {inviteForm.errors.email && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {inviteForm.errors.email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-700">
                                        Roles
                                    </label>
                                    <div className="mt-1">
                                        <MultiCheck
                                            options={roles}
                                            selected={inviteForm.data.roles}
                                            onToggle={(v) =>
                                                toggle(
                                                    inviteForm.data.roles,
                                                    v,
                                                    (roles) =>
                                                        inviteForm.setData(
                                                            'roles',
                                                            roles,
                                                        ),
                                                )
                                            }
                                        />
                                    </div>
                                    {inviteForm.errors.roles && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {inviteForm.errors.roles}
                                        </p>
                                    )}
                                </div>

                                {branches.length > 0 && (
                                    <div>
                                        <label className="text-sm text-gray-700">
                                            Branch access (leave empty for
                                            all branches)
                                        </label>
                                        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {branches.map((b) => (
                                                <label
                                                    key={b.id}
                                                    className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                                        checked={inviteForm.data.branch_ids.includes(
                                                            b.id,
                                                        )}
                                                        onChange={() =>
                                                            toggleBranch(
                                                                inviteForm.data
                                                                    .branch_ids,
                                                                b.id,
                                                                (ids) =>
                                                                    inviteForm.setData(
                                                                        'branch_ids',
                                                                        ids,
                                                                    ),
                                                            )
                                                        }
                                                    />
                                                    {b.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={inviteForm.processing}
                                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Send invitation
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {invitations.length > 0 && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-base font-semibold text-gray-900">
                                Pending invitations
                            </h3>
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="py-2">Email</th>
                                        <th className="py-2">Roles</th>
                                        <th className="py-2">Expires</th>
                                        <th className="py-2 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invitations.map((inv) => (
                                        <tr key={inv.id}>
                                            <td className="py-3 text-gray-800">
                                                {inv.email}
                                            </td>
                                            <td className="py-3 text-gray-600">
                                                {inv.roles.join(', ')}
                                            </td>
                                            <td className="py-3 text-gray-600">
                                                {new Date(
                                                    inv.expires_at,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-right">
                                                {canManage && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() =>
                                                                router.post(
                                                                    route(
                                                                        'staff.invitations.resend',
                                                                        inv.id,
                                                                    ),
                                                                    {},
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                            className="text-indigo-600 hover:text-indigo-700"
                                                        >
                                                            Resend
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                router.delete(
                                                                    route(
                                                                        'staff.invitations.destroy',
                                                                        inv.id,
                                                                    ),
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            Revoke
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">
                            Team members
                        </h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Roles</th>
                                    <th className="py-2">Branches</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Last login</th>
                                    <th className="py-2 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {staff.map((member) => (
                                    <tr key={member.id}>
                                        <td className="py-3">
                                            <div className="font-medium text-gray-800">
                                                {member.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {member.email}
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {member.role_labels.join(', ') ||
                                                '—'}
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {member.branch_names.join(', ') ||
                                                'All'}
                                        </td>
                                        <td className="py-3">
                                            <Badge tone={member.is_active ? 'success' : 'neutral'}>
                                                {member.is_active ? 'Active' : 'Deactivated'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 text-gray-600">
                                            {member.last_login_at
                                                ? new Date(
                                                      member.last_login_at,
                                                  ).toLocaleDateString()
                                                : 'Never'}
                                        </td>
                                        <td className="py-3 text-right">
                                            {canManage && (
                                                <div className="flex justify-end gap-3 text-xs">
                                                    <button
                                                        onClick={() =>
                                                            openEdit(member)
                                                        }
                                                        className="text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        Edit access
                                                    </button>
                                                    {member.is_active ? (
                                                        !member.is_self && (
                                                            <button
                                                                onClick={() =>
                                                                    post(
                                                                        'staff.deactivate',
                                                                        member,
                                                                    )
                                                                }
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                Deactivate
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                post(
                                                                    'staff.reactivate',
                                                                    member,
                                                                )
                                                            }
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            Reactivate
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            post(
                                                                'staff.revoke-sessions',
                                                                member,
                                                            )
                                                        }
                                                        className="text-gray-600 hover:text-gray-800"
                                                    >
                                                        Revoke sessions
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editing && canManage && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900">
                            Edit access — {editing.name}
                        </h3>
                        <form
                            onSubmit={submitEdit}
                            className="mt-4 space-y-4"
                        >
                            <div>
                                <label className="text-sm text-gray-700">
                                    Roles
                                </label>
                                <div className="mt-1">
                                    <MultiCheck
                                        options={roles}
                                        selected={editForm.data.roles}
                                        onToggle={(v) =>
                                            toggle(
                                                editForm.data.roles,
                                                v,
                                                (r) =>
                                                    editForm.setData('roles', r),
                                            )
                                        }
                                    />
                                </div>
                                {editForm.errors.roles && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {editForm.errors.roles}
                                    </p>
                                )}
                            </div>

                            {branches.length > 0 && (
                                <div>
                                    <label className="text-sm text-gray-700">
                                        Branch access (empty = all branches)
                                    </label>
                                    <div className="mt-1 grid grid-cols-2 gap-2">
                                        {branches.map((b) => (
                                            <label
                                                key={b.id}
                                                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                                    checked={editForm.data.branch_ids.includes(
                                                        b.id,
                                                    )}
                                                    onChange={() =>
                                                        toggleBranch(
                                                            editForm.data
                                                                .branch_ids,
                                                            b.id,
                                                            (ids) =>
                                                                editForm.setData(
                                                                    'branch_ids',
                                                                    ids,
                                                                ),
                                                        )
                                                    }
                                                />
                                                {b.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Save changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
