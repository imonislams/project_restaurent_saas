import { Badge, Button, Card, CardBody, CardHeader } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface RoleRow {
    id: number;
    name: string;
    slug: string;
    permissions: string[];
    locked: boolean;
}

interface Option {
    value: string;
    label: string;
}

export default function SecurityRoles({ roles, permissions }: { roles: RoleRow[]; permissions: Option[] }) {
    const [active, setActive] = useState<RoleRow>(roles[0]);
    const [selected, setSelected] = useState<string[]>(roles[0]?.permissions ?? []);
    const [processing, setProcessing] = useState(false);

    const select = (role: RoleRow) => {
        setActive(role);
        setSelected(role.permissions);
    };

    const toggle = (value: string) => setSelected((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));

    const save = () => {
        setProcessing(true);
        router.patch(route('platform.roles.update', active.id), { permissions: selected }, { preserveScroll: true, onFinish: () => setProcessing(false) });
    };

    return (
        <PlatformLayout title="Roles & Permissions">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <Card>
                    <CardHeader title="Platform roles" />
                    <CardBody className="space-y-1">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => select(role)}
                                className={'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ' + (active?.id === role.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50')}
                            >
                                <span>{role.name}</span>
                                <span className="text-xs text-gray-400">{role.permissions.length}</span>
                            </button>
                        ))}
                    </CardBody>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader
                        title={active ? `${active.name} permissions` : 'Permissions'}
                        description={active?.locked ? 'This role is locked and always holds every platform permission.' : 'Grant or revoke platform permissions for this role.'}
                        action={
                            active && !active.locked ? (
                                <Button size="sm" loading={processing} onClick={save}>Save permissions</Button>
                            ) : (
                                <Badge tone="warning">Locked</Badge>
                            )
                        }
                    />
                    <CardBody>
                        {active?.locked ? (
                            <p className="text-sm text-gray-500">The SaaS super admin role cannot be edited.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {permissions.map((permission) => (
                                    <label key={permission.value} className="flex items-center gap-2 text-sm text-gray-700">
                                        <input type="checkbox" checked={selected.includes(permission.value)} onChange={() => toggle(permission.value)} className="rounded border-gray-300" />
                                        <span className="font-mono text-xs">{permission.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
