import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    cn,
    ConfirmDialog,
    Drawer,
    EmptyState,
    PageHeader,
    TextareaField,
    TextField,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

interface RoleUser {
    id: number;
    name: string;
    email: string;
}

interface RoleRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_system: boolean;
    is_custom: boolean;
    permissions: string[];
    users: RoleUser[];
}

interface PermissionGroup {
    group: string;
    label: string;
    permissions: { value: string; label: string }[];
}

interface Props {
    roles: RoleRow[];
    permission_groups: PermissionGroup[];
    grantable: string[];
    can_manage: boolean;
}

function PermissionGroups({
    groups,
    value,
    onToggle,
    onBulk,
    isGrantable,
    readOnly = false,
}: {
    groups: PermissionGroup[];
    value: string[];
    onToggle: (permission: string) => void;
    onBulk: (group: PermissionGroup, mode: 'all' | 'none') => void;
    isGrantable: (permission: string) => boolean;
    readOnly?: boolean;
}) {
    return (
        <div className="space-y-4">
            {groups.map((group) => {
                const grantableCount = group.permissions.filter((p) => isGrantable(p.value)).length;
                const selectedCount = group.permissions.filter((p) => value.includes(p.value)).length;

                return (
                    <div key={group.group} className="overflow-hidden rounded-lg border border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold tracking-tight text-foreground">{group.label}</span>
                                <span className="text-[11px] text-muted-foreground">
                                    {selectedCount}/{group.permissions.length}
                                </span>
                            </div>
                            {!readOnly && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="ghost"
                                        disabled={grantableCount === 0}
                                        onClick={() => onBulk(group, 'all')}
                                    >
                                        Select all
                                    </Button>
                                    <Button type="button" size="xs" variant="ghost" onClick={() => onBulk(group, 'none')}>
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                            {group.permissions.map((permission) => {
                                const grantable = isGrantable(permission.value);
                                const checked = value.includes(permission.value);

                                return (
                                    <label
                                        key={permission.value}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition',
                                            checked ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-border/80',
                                            (readOnly || !grantable) && 'cursor-not-allowed opacity-60',
                                        )}
                                        title={!grantable && !readOnly ? 'You do not hold this permission, so you cannot grant it.' : undefined}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={readOnly || !grantable}
                                            onChange={() => onToggle(permission.value)}
                                            className="h-4 w-4 shrink-0 rounded border-input text-primary shadow-xs focus-visible:ring-1 focus-visible:ring-ring"
                                        />
                                        <span className="flex-1 font-medium">{permission.label}</span>
                                        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{permission.value}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function RolesIndex({ roles, permission_groups, grantable, can_manage }: Props) {
    const { flash, errors } = usePage().props as Record<string, any>;

    const validationBanner = useMemo(
        () =>
            Object.entries((errors ?? {}) as Record<string, string>)
                .filter(([key]) => key === 'role' || key === 'permissions' || key.startsWith('permissions.'))
                .map(([, message]) => message),
        [errors],
    );

    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(roles[0]?.id ?? null);
    const [showCreate, setShowCreate] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null);

    const isGrantable = (permission: string) => grantable.includes(permission);

    const selected = useMemo(
        () => roles.find((role) => role.id === selectedId) ?? roles[0] ?? null,
        [roles, selectedId],
    );

    const filteredRoles = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return roles;

        return roles.filter(
            (role) =>
                role.name.toLowerCase().includes(q) ||
                (role.description ?? '').toLowerCase().includes(q) ||
                role.permissions.some((p) => p.toLowerCase().includes(q)),
        );
    }, [roles, search]);

    const editForm = useForm({ name: '', description: '', permissions: [] as string[] });
    const createForm = useForm({ name: '', description: '', permissions: [] as string[] });

    useEffect(() => {
        if (!selected) return;
        editForm.setData({
            name: selected.name,
            description: selected.description ?? '',
            permissions: selected.permissions,
        });
        editForm.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

    const togglePermission = (form: typeof editForm, permission: string) => {
        const current = form.data.permissions;
        form.setData(
            'permissions',
            current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission],
        );
    };

    const bulkPermission = (form: typeof editForm, group: PermissionGroup, mode: 'all' | 'none') => {
        const values = group.permissions.map((p) => p.value);
        const current = form.data.permissions;

        const next =
            mode === 'all'
                ? Array.from(new Set([...current, ...values.filter(isGrantable)]))
                : current.filter((v) => !values.includes(v));

        form.setData('permissions', next);
    };

    const saveEdit = () => {
        if (!selected) return;
        editForm.patch(route('roles.update', selected.id), { preserveScroll: true });
    };

    const onEditSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        saveEdit();
    };

    const onCreateSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post(route('roles.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setShowCreate(false);
            },
        });
    };

    const runDelete = () => {
        if (!confirmDelete) return;
        router.delete(route('roles.destroy', confirmDelete.id), {
            preserveScroll: true,
            onFinish: () => setConfirmDelete(null),
        });
    };

    const canEditSelected = Boolean(selected && !selected.is_system && selected.is_custom && can_manage);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Roles & Permissions"
                    description="Create custom roles and grant the exact permissions each team needs."
                    breadcrumb={[{ label: 'Staff' }, { label: 'Roles & Permissions' }]}
                    actions={
                        can_manage && (
                            <Button size="sm" onClick={() => setShowCreate(true)}>
                                + Create Role
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Roles & Permissions" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
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
                    {validationBanner.length > 0 && (
                        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                            <ul className="list-disc space-y-0.5 pl-5">
                                {validationBanner.map((message, index) => (
                                    <li key={index}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                        <Card className="lg:col-span-4">
                            <CardHeader
                                title={`Roles (${filteredRoles.length})`}
                                description="System and custom roles for this restaurant."
                            />
                            <CardBody className="space-y-3 p-4">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search roles or permissions…"
                                        className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    {filteredRoles.length === 0 ? (
                                        <p className="px-1 py-6 text-center text-xs text-muted-foreground">No roles match your search.</p>
                                    ) : (
                                        filteredRoles.map((role) => {
                                            const active = selected?.id === role.id;
                                            return (
                                                <button
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => setSelectedId(role.id)}
                                                    className={cn(
                                                        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition',
                                                        active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60',
                                                    )}
                                                >
                                                    <span className="min-w-0">
                                                        <span className={cn('block truncate text-sm', active ? 'font-semibold text-primary' : 'font-medium text-foreground')}>
                                                            {role.name}
                                                        </span>
                                                        <span className="block text-[11px] text-muted-foreground">
                                                            {role.permissions.length} permissions · {role.users.length} users
                                                        </span>
                                                    </span>
                                                    <Badge tone={role.is_system ? 'neutral' : 'brand'} dot={false}>
                                                        {role.is_system ? 'System' : 'Custom'}
                                                    </Badge>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="lg:col-span-8">
                            <CardHeader
                                title={selected ? selected.name : 'Select a role'}
                                description={
                                    selected?.is_system
                                        ? 'System role — definition and permissions are fixed.'
                                        : selected?.description || 'Custom role — adjust the name and granted permissions.'
                                }
                                action={
                                    selected && canEditSelected ? (
                                        <div className="flex items-center gap-2">
                                            {selected.users.length === 0 ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => setConfirmDelete(selected)}
                                                >
                                                    Delete
                                                </Button>
                                            ) : (
                                                <Badge tone="warning" dot={false}>
                                                    In use
                                                </Badge>
                                            )}
                                            <Button size="sm" loading={editForm.processing} onClick={saveEdit}>
                                                Save changes
                                            </Button>
                                        </div>
                                    ) : selected ? (
                                        <Badge tone="neutral" dot={false}>
                                            {selected.is_system ? 'System' : 'Read only'}
                                        </Badge>
                                    ) : null
                                }
                            />
                            <CardBody className="space-y-6">
                                {!selected ? (
                                    <EmptyState
                                        title="No role selected"
                                        description="Choose a role from the list to review or edit its permissions."
                                    />
                                ) : (
                                    <>
                                        {selected.is_system && (
                                            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                                                This is a system-defined role. Its permissions are managed by the platform and cannot be edited or deleted here.
                                            </div>
                                        )}

                                        {canEditSelected ? (
                                            <form onSubmit={onEditSubmit} className="space-y-5">
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <TextField
                                                        label="Role name"
                                                        value={editForm.data.name}
                                                        error={editForm.errors.name}
                                                        onChange={(v) => editForm.setData('name', v)}
                                                    />
                                                    <TextareaField
                                                        label="Description"
                                                        rows={1}
                                                        value={editForm.data.description}
                                                        error={editForm.errors.description}
                                                        onChange={(v) => editForm.setData('description', v)}
                                                    />
                                                </div>

                                                {editForm.errors.permissions && (
                                                    <p className="text-xs font-medium text-destructive">{editForm.errors.permissions}</p>
                                                )}

                                                <PermissionGroups
                                                    groups={permission_groups}
                                                    value={editForm.data.permissions}
                                                    onToggle={(permission) => togglePermission(editForm, permission)}
                                                    onBulk={(group, mode) => bulkPermission(editForm, group, mode)}
                                                    isGrantable={isGrantable}
                                                />
                                            </form>
                                        ) : (
                                            <PermissionGroups
                                                groups={permission_groups}
                                                value={selected.permissions}
                                                onToggle={() => undefined}
                                                onBulk={() => undefined}
                                                isGrantable={() => true}
                                                readOnly
                                            />
                                        )}

                                        <div className="border-t border-border pt-4">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-semibold tracking-tight text-foreground">
                                                    Assigned users ({selected.users.length})
                                                </h4>
                                                {can_manage && (
                                                    <Button size="sm" variant="link" href={route('staff.index')}>
                                                        Assign on Staff page
                                                    </Button>
                                                )}
                                            </div>
                                            {selected.users.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No users are assigned to this role yet.</p>
                                            ) : (
                                                <ul className="space-y-1.5">
                                                    {selected.users.map((user) => (
                                                        <li
                                                            key={user.id}
                                                            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                                                        >
                                                            <span className="font-medium text-foreground">{user.name}</span>
                                                            <span className="text-muted-foreground">{user.email}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {canEditSelected && selected.users.length > 0 && (
                                                <p className="mt-3 text-xs text-muted-foreground">
                                                    This role is assigned to {selected.users.length} user(s). Reassign them on the Staff page before
                                                    deleting it.
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>

            <Drawer
                show={showCreate}
                onClose={() => setShowCreate(false)}
                title="Create Role"
                width="max-w-2xl"
                footer={
                    <div className="flex justify-end gap-2.5">
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>
                            Cancel
                        </Button>
                        <Button loading={createForm.processing} onClick={onCreateSubmit}>
                            Create Role
                        </Button>
                    </div>
                }
            >
                <form onSubmit={onCreateSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                            label="Role name"
                            placeholder="e.g. Waiter, Cashier, Branch Manager"
                            value={createForm.data.name}
                            error={createForm.errors.name}
                            onChange={(v) => createForm.setData('name', v)}
                        />
                        <TextareaField
                            label="Description (optional)"
                            rows={1}
                            placeholder="What this role is responsible for"
                            value={createForm.data.description}
                            error={createForm.errors.description}
                            onChange={(v) => createForm.setData('description', v)}
                        />
                    </div>

                    {Object.entries(createForm.errors)
                        .filter(([key]) => key === 'permissions' || key.startsWith('permissions.'))
                        .map(([key, message]) => (
                            <p key={key} className="text-xs font-medium text-destructive">
                                {String(message)}
                            </p>
                        ))}

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-tight text-foreground">Permissions</span>
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    onClick={() =>
                                        createForm.setData(
                                            'permissions',
                                            permission_groups.flatMap((g) => g.permissions.map((p) => p.value)).filter(isGrantable),
                                        )
                                    }
                                >
                                    Select all
                                </Button>
                                <Button type="button" size="xs" variant="ghost" onClick={() => createForm.setData('permissions', [])}>
                                    Clear all
                                </Button>
                            </div>
                        </div>

                        <PermissionGroups
                            groups={permission_groups}
                            value={createForm.data.permissions}
                            onToggle={(permission) => togglePermission(createForm, permission)}
                            onBulk={(group, mode) => bulkPermission(createForm, group, mode)}
                            isGrantable={isGrantable}
                        />
                    </div>
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmDelete !== null}
                title={`Delete the "${confirmDelete?.name ?? ''}" role?`}
                description="This permanently removes the custom role. Users, orders and other records are not affected. This cannot be undone."
                confirmLabel="Delete Role"
                tone="danger"
                onConfirm={runDelete}
                onClose={() => setConfirmDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
