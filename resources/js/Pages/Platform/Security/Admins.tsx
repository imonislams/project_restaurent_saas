import {
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Card,
    Drawer,
    EmptyState,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatDate,
} from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { Key, LogOut, Plus, Shield, User, UserCheck, UserX } from 'lucide-react';
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

const inputClass =
    'h-9 w-full rounded-md border border-input bg-background py-1.5 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs';

export default function SecurityAdmins({ admins, roles }: { admins: AdminRow[]; roles: Option[] }) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<AdminRow | null>(null);

    const create = useForm({ name: '', email: '', password: '', roles: [] as string[] });
    const edit = useForm({ roles: [] as string[] });

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        create.post(route('platform.admins.store'), {
            preserveScroll: true,
            onSuccess: () => {
                create.reset();
                setCreateOpen(false);
            },
        });
    };

    const openEdit = (admin: AdminRow) => {
        setEditing(admin);
        edit.setData('roles', admin.role_slugs);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        edit.patch(route('platform.admins.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const roleCheckboxes = (selected: string[], toggle: (value: string) => void) => (
        <div className="flex flex-wrap gap-2.5 pt-1">
            {roles.map((role) => (
                <label
                    key={role.value}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                    <input
                        type="checkbox"
                        checked={selected.includes(role.value)}
                        onChange={() => toggle(role.value)}
                        className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring"
                    />
                    <span>{role.label}</span>
                </label>
            ))}
        </div>
    );

    return (
        <PlatformLayout
            title="Administrators"
            description="Platform administrators sign in to this control center with platform-level privileges."
            actions={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New administrator
                </Button>
            }
        >
            <Card className="shadow-xs border-border/80 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/80 px-5 py-3 bg-muted/20">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Platform Roster ({admins.length} active admins)
                    </span>
                </div>

                {admins.length === 0 ? (
                    <EmptyState
                        title="No platform administrators"
                        description="Invite or provision admins to manage platform operations."
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Administrator</TableHead>
                                <TableHead>Assigned Roles</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Sign-in</TableHead>
                                <TableHead className="text-right">Sessions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admins.map((admin) => (
                                <TableRow key={admin.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 rounded-full border border-border/60">
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                    {admin.name.slice(0, 1).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                    <span>{admin.name}</span>
                                                    {admin.is_self && (
                                                        <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{admin.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {admin.roles.map((role) => (
                                                <Badge key={role} tone="neutral" className="text-[11px]">
                                                    {role}
                                                </Badge>
                                            ))}
                                            {admin.roles.length === 0 && (
                                                <span className="text-xs text-muted-foreground/60 italic">No roles</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge tone={admin.status === 'active' ? 'success' : 'neutral'}>
                                            {admin.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {admin.last_login_at ? formatDate(admin.last_login_at) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-semibold text-foreground">
                                        {admin.sessions}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => openEdit(admin)}
                                                className="text-xs"
                                            >
                                                <Key className="mr-1 h-3 w-3 text-muted-foreground" />
                                                Roles
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() =>
                                                    router.post(
                                                        route('platform.admins.revoke-sessions', admin.id),
                                                        {},
                                                        { preserveScroll: true }
                                                    )
                                                }
                                                className="text-xs"
                                            >
                                                <LogOut className="mr-1 h-3 w-3 text-muted-foreground" />
                                                Revoke
                                            </Button>
                                            {admin.status === 'active' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() =>
                                                        router.post(
                                                            route('platform.admins.deactivate', admin.id),
                                                            {},
                                                            { preserveScroll: true }
                                                        )
                                                    }
                                                    disabled={admin.is_self}
                                                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <UserX className="mr-1 h-3 w-3" />
                                                    Deactivate
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() =>
                                                        router.post(
                                                            route('platform.admins.reactivate', admin.id),
                                                            {},
                                                            { preserveScroll: true }
                                                        )
                                                    }
                                                    className="text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                                >
                                                    <UserCheck className="mr-1 h-3 w-3" />
                                                    Reactivate
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Modal Drawer: Create Administrator */}
            <Drawer
                show={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New platform administrator"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" loading={create.processing} onClick={submitCreate}>
                            Create administrator
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitCreate} className="space-y-3.5">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">Name</label>
                        <input
                            className={inputClass}
                            value={create.data.name}
                            onChange={(e) => create.setData('name', e.target.value)}
                            placeholder="e.g. Jane Doe"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">Email</label>
                        <input
                            type="email"
                            className={inputClass}
                            value={create.data.email}
                            onChange={(e) => create.setData('email', e.target.value)}
                            placeholder="jane@company.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">Password</label>
                        <input
                            type="password"
                            className={inputClass}
                            value={create.data.password}
                            onChange={(e) => create.setData('password', e.target.value)}
                            placeholder="••••••••••••"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">Platform Roles</label>
                        {roleCheckboxes(create.data.roles, (value) =>
                            create.setData(
                                'roles',
                                create.data.roles.includes(value)
                                    ? create.data.roles.filter((r) => r !== value)
                                    : [...create.data.roles, value]
                            )
                        )}
                    </div>
                    {Object.values(create.errors)[0] && (
                        <p className="text-xs text-destructive">{Object.values(create.errors)[0]}</p>
                    )}
                </form>
            </Drawer>

            {/* Modal Drawer: Edit Roles */}
            <Drawer
                show={editing !== null}
                onClose={() => setEditing(null)}
                title={`Manage Roles — ${editing?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                            Cancel
                        </Button>
                        <Button size="sm" loading={edit.processing} onClick={submitEdit}>
                            Save roles
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitEdit} className="space-y-3.5">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">Assigned Roles</label>
                        {roleCheckboxes(edit.data.roles, (value) =>
                            edit.setData(
                                'roles',
                                edit.data.roles.includes(value)
                                    ? edit.data.roles.filter((r) => r !== value)
                                    : [...edit.data.roles, value]
                            )
                        )}
                    </div>
                    {Object.values(edit.errors)[0] && (
                        <p className="text-xs text-destructive">{Object.values(edit.errors)[0]}</p>
                    )}
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
