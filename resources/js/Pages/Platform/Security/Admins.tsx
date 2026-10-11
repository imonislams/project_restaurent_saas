import { Badge, Button, Card, CardBody, CardHeader, Drawer, EmptyState, formatDate } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface AdminRow {
    id: number;
    name: string;
    email: string;
    status: string;
    roles: string[];
    role_slugs: string[];
    last_login_at: string | null;
    sessions: number;
    is_self: boolean;
}

interface Option {
    value: string;
    label: string;
}

const input = 'block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400';

export default function SecurityAdmins({ admins, roles }: { admins: AdminRow[]; roles: Option[] }) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<AdminRow | null>(null);

    const create = useForm({ name: '', email: '', password: '', roles: [] as string[] });
    const edit = useForm({ roles: [] as string[] });

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        create.post(route('platform.admins.store'), { preserveScroll: true, onSuccess: () => { create.reset(); setCreateOpen(false); } });
    };

    const openEdit = (admin: AdminRow) => {
        setEditing(admin);
        edit.setData('roles', admin.role_slugs);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        edit.patch(route('platform.admins.update', editing.id), { preserveScroll: true, onSuccess: () => setEditing(null) });
    };

    const roleCheckboxes = (selected: string[], toggle: (value: string) => void) => (
        <div className="flex flex-wrap gap-3">
            {roles.map((role) => (
                <label key={role.value} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={selected.includes(role.value)} onChange={() => toggle(role.value)} className="rounded border-gray-300" />
                    {role.label}
                </label>
            ))}
        </div>
    );

    return (
        <PlatformLayout title="Administrators">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Platform administrators sign in to this control center. They hold platform permissions only and never tenant business permissions.</p>
                <Button size="sm" onClick={() => setCreateOpen(true)}>New administrator</Button>
            </div>

            <Card>
                {admins.length === 0 ? (
                    <EmptyState title="No platform administrators" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-2">Administrator</th>
                                    <th className="px-4 py-2">Roles</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Last login</th>
                                    <th className="px-4 py-2 text-right">Sessions</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{admin.name}{admin.is_self && <span className="ml-2 text-xs text-gray-400">(you)</span>}</div>
                                            <div className="text-xs text-gray-400">{admin.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {admin.roles.map((role) => (
                                                    <Badge key={role} tone="neutral">{role}</Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><Badge tone={admin.status === 'active' ? 'success' : 'neutral'}>{admin.status}</Badge></td>
                                        <td className="px-4 py-3 text-gray-500">{admin.last_login_at ? formatDate(admin.last_login_at) : '—'}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{admin.sessions}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-3 text-xs">
                                                <button onClick={() => openEdit(admin)} className="font-medium text-indigo-600 hover:text-indigo-700">Roles</button>
                                                <button onClick={() => router.post(route('platform.admins.revoke-sessions', admin.id), {}, { preserveScroll: true })} className="font-medium text-gray-600 hover:text-gray-800">Revoke</button>
                                                {admin.status === 'active' ? (
                                                    <button onClick={() => router.post(route('platform.admins.deactivate', admin.id), {}, { preserveScroll: true })} disabled={admin.is_self} className="font-medium text-red-600 hover:text-red-700 disabled:text-gray-300">Deactivate</button>
                                                ) : (
                                                    <button onClick={() => router.post(route('platform.admins.reactivate', admin.id), {}, { preserveScroll: true })} className="font-medium text-green-600 hover:text-green-700">Reactivate</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Drawer show={createOpen} onClose={() => setCreateOpen(false)} title="New platform administrator" footer={<Button size="sm" loading={create.processing} onClick={submitCreate}>Create administrator</Button>}>
                <form onSubmit={submitCreate} className="space-y-3">
                    <label className="block"><span className="mb-1 block text-xs font-medium text-gray-500">Name</span><input className={input} value={create.data.name} onChange={(e) => create.setData('name', e.target.value)} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-medium text-gray-500">Email</span><input className={input} value={create.data.email} onChange={(e) => create.setData('email', e.target.value)} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-medium text-gray-500">Password</span><input type="password" className={input} value={create.data.password} onChange={(e) => create.setData('password', e.target.value)} /></label>
                    <div>
                        <span className="mb-1 block text-xs font-medium text-gray-500">Roles</span>
                        {roleCheckboxes(create.data.roles, (value) => create.setData('roles', create.data.roles.includes(value) ? create.data.roles.filter((r) => r !== value) : [...create.data.roles, value]))}
                    </div>
                    {Object.values(create.errors)[0] && <p className="text-xs text-red-600">{Object.values(create.errors)[0]}</p>}
                </form>
            </Drawer>

            <Drawer show={editing !== null} onClose={() => setEditing(null)} title={`Roles — ${editing?.name ?? ''}`} footer={<Button size="sm" loading={edit.processing} onClick={submitEdit}>Save roles</Button>}>
                <form onSubmit={submitEdit} className="space-y-3">
                    {roleCheckboxes(edit.data.roles, (value) => edit.setData('roles', edit.data.roles.includes(value) ? edit.data.roles.filter((r) => r !== value) : [...edit.data.roles, value]))}
                    {Object.values(edit.errors)[0] && <p className="text-xs text-red-600">{Object.values(edit.errors)[0]}</p>}
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
