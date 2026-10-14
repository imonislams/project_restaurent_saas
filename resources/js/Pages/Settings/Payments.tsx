import { Badge, Button, Card, CardBody, ConfirmDialog, Drawer, EmptyState, Input, CheckboxField, SelectField, TextField, PageHeader, Tabs } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useT } from '@/i18n';
import { router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';

const GROUPS = ['company', 'branches', 'hours', 'tax', 'receipt', 'pos', 'notifications', 'qr', 'payments'] as const;

interface GatewayConfig {
    id: number;
    name: string;
    provider: string;
    environment: string;
    is_enabled: boolean;
    is_default: boolean;
    supported_currencies: string[];
    credential_keys: string[];
    health_status: string | null;
    last_ok_at: string | null;
    last_error: string | null;
}

interface ProviderField {
    key: string;
    label: string;
    secret?: boolean;
}

interface Provider {
    label: string;
    fields: ProviderField[];
}

const HEALTH_TONE: Record<string, BadgeTone> = { ok: 'success', error: 'danger' };

export default function SettingsPayments({
    gateways,
    providers,
    schema,
    required_credentials,
    currencies,
}: {
    gateways: GatewayConfig[];
    providers: string[];
    schema: Record<string, Provider>;
    required_credentials: Record<string, string[]>;
    currencies: { value: string; label: string }[];
}) {
    const t = useT();
    const { flash } = usePage().props as Record<string, any>;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<GatewayConfig | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<GatewayConfig | null>(null);

    const form = useForm<{
        name: string;
        provider: string;
        environment: string;
        is_enabled: boolean;
        supported_currencies: string[];
        credentials: Record<string, string>;
    }>({
        name: '',
        provider: providers[0] ?? 'cash',
        environment: 'sandbox',
        is_enabled: true,
        supported_currencies: [],
        credentials: {},
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', provider: providers[0] ?? 'cash', environment: 'sandbox', is_enabled: true, supported_currencies: [], credentials: {} });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (gateway: GatewayConfig) => {
        setEditing(gateway);
        form.setData({ name: gateway.name, provider: gateway.provider, environment: gateway.environment, is_enabled: gateway.is_enabled, supported_currencies: gateway.supported_currencies, credentials: {} });
        form.clearErrors();
        setOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => { setOpen(false); setEditing(null); } };
        if (editing) form.patch(route('settings.payments.update', editing.id), options);
        else form.post(route('settings.payments.store'), options);
    };

    const active = schema[form.data.provider] ?? { label: form.data.provider, fields: [] };

    return (
        <AuthenticatedLayout header={<PageHeader title={t('settings.title')} description={t('settings.subtitle')} />}>
            <div className="py-6">
                <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    <Tabs
                        tabs={GROUPS.map((key) => ({ key, label: t(`settings.tab.${key}`) }))}
                        value="payments"
                        onChange={(key) => router.get(key === 'payments' ? route('settings.payments.index') : route('settings.show', { group: key }))}
                    />

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight text-foreground">Payment gateways</h2>
                            <p className="text-xs text-muted-foreground">Enable several methods at once — cash is always available to your cashiers. One is the default for online and QR payments.</p>
                        </div>
                        <Button size="sm" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                            Add gateway
                        </Button>
                    </div>

                    {gateways.length === 0 ? (
                        <Card>
                            <EmptyState title="No gateways configured" description="Add cash, card, or an online gateway (Stripe / SSLCommerz / bKash) to accept customer payments." action={<Button size="sm" onClick={openCreate}>Add gateway</Button>} />
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {gateways.map((gateway) => (
                                <Card key={gateway.id}>
                                    <CardBody className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">{gateway.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {schema[gateway.provider]?.label ?? gateway.provider} · <span className="capitalize">{gateway.environment}</span>
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                                {gateway.is_default && <Badge tone="info">Default</Badge>}
                                                <Badge tone={gateway.is_enabled ? 'success' : 'neutral'}>{gateway.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                                                {gateway.health_status && <Badge tone={HEALTH_TONE[gateway.health_status] ?? 'neutral'}>{gateway.health_status === 'ok' ? 'Config OK' : 'Config Error'}</Badge>}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {gateway.supported_currencies.length === 0 ? (
                                                <span className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">All currencies</span>
                                            ) : (
                                                gateway.supported_currencies.map((c) => (
                                                    <span key={c} className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-foreground">{c}</span>
                                                ))
                                            )}
                                        </div>

                                        {gateway.last_error && <p className="text-xs text-destructive">{gateway.last_error}</p>}

                                        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-xs">
                                            <Button size="xs" variant="outline" onClick={() => router.post(route('settings.payments.toggle', gateway.id), {}, { preserveScroll: true })}>
                                                {gateway.is_enabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            {!gateway.is_default && <Button size="xs" variant="outline" onClick={() => router.post(route('settings.payments.default', gateway.id), {}, { preserveScroll: true })}>Set default</Button>}
                                            <Button size="xs" variant="ghost" onClick={() => router.post(route('settings.payments.test', gateway.id), {}, { preserveScroll: true })}>Test</Button>
                                            <Button size="xs" variant="ghost" onClick={() => openEdit(gateway)}>Edit</Button>
                                            <Button size="xs" variant="ghost" className="ml-auto text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(gateway)}>Remove</Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    )}

                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" /> Credentials are encrypted at rest and never returned to the browser. A payment is only marked paid once the provider is verified server-side.
                    </p>
                </div>
            </div>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? `Edit ${editing.name}` : 'Add gateway'}
                footer={<Button size="sm" loading={form.processing} onClick={submit}>{editing ? 'Save changes' : 'Add gateway'}</Button>}
            >
                <form onSubmit={submit} className="space-y-4">
                    <TextField label="Name" value={form.data.name} hint="e.g. SSLCommerz Production" error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                    <SelectField
                        label="Provider"
                        value={form.data.provider}
                        options={providers.map((p) => ({ value: p, label: schema[p]?.label ?? p }))}
                        onChange={(v) => form.setData('provider', v)}
                    />
                    <SelectField
                        label="Environment"
                        value={form.data.environment}
                        options={[{ value: 'sandbox', label: 'Sandbox (test mode)' }, { value: 'production', label: 'Production (live)' }]}
                        onChange={(v) => form.setData('environment', v)}
                    />
                    <CheckboxField label="Enable this gateway" checked={form.data.is_enabled} onChange={(v) => form.setData('is_enabled', v)} />

                    <div>
                        <span className="mb-1.5 block text-xs font-semibold tracking-tight text-foreground">Supported currencies (empty = all)</span>
                        <div className="flex flex-wrap gap-2.5">
                            {currencies.map((c) => (
                                <label key={c.value} className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground/80">
                                    <input
                                        type="checkbox"
                                        checked={form.data.supported_currencies.includes(c.value)}
                                        onChange={(e) => form.setData('supported_currencies', e.target.checked ? [...form.data.supported_currencies, c.value] : form.data.supported_currencies.filter((x) => x !== c.value))}
                                        className="h-4 w-4 rounded border-input text-primary shadow-xs focus:ring-ring"
                                    />
                                    {c.value}
                                </label>
                            ))}
                        </div>
                    </div>

                    {active.fields.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {active.fields.map((field) => (
                                <label key={field.key} className="block space-y-1">
                                    <span className="block text-xs font-semibold tracking-tight text-foreground">{field.label}</span>
                                    <Input
                                        type={field.secret ? 'password' : 'text'}
                                        value={form.data.credentials[field.key] ?? ''}
                                        placeholder={editing?.credential_keys.includes(field.key) ? '•••••••• stored' : 'Not set'}
                                        onChange={(e) => form.setData('credentials', { ...form.data.credentials, [field.key]: e.target.value })}
                                        className={field.secret ? 'font-mono text-xs' : ''}
                                    />
                                </label>
                            ))}
                        </div>
                    )}
                    {form.errors.credentials && <p className="text-xs text-destructive">{form.errors.credentials}</p>}
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmDelete !== null}
                title={`Remove ${confirmDelete?.name ?? 'gateway'}?`}
                description="Historical payments are preserved; only the configuration is removed."
                confirmLabel="Remove"
                onConfirm={() => {
                    if (confirmDelete) router.delete(route('settings.payments.destroy', confirmDelete.id), { preserveScroll: true, onFinish: () => setConfirmDelete(null) });
                }}
                onClose={() => setConfirmDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
