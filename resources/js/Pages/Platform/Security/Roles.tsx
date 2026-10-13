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
                                className={'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ' + (active?.id === role.id ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted/60')}
                            >
                                <span>{role.name}</span>
                                <span className="text-xs text-muted-foreground">{role.permissions.length}</span>
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
                            <p className="text-sm text-muted-foreground">The SaaS super admin role cannot be edited.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                {permissions.map((permission) => (
                                    <label 
                                        key={permission.value} 
                                        className={'flex items-center gap-2.5 rounded-lg border p-2.5 text-sm cursor-pointer select-none transition ' + (selected.includes(permission.value) ? 'border-primary/50 bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:border-border/80')}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={selected.includes(permission.value)} 
                                            onChange={() => toggle(permission.value)} 
                                            className="h-4 w-4 rounded border-input text-primary shadow-2xs focus-visible:ring-1 focus-visible:ring-ring" 
                                        />
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
