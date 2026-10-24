import {
    Badge,
    Button,
    Card,
    CardBody,
    ConfirmDialog,
    Drawer,
    EmptyState,
    Input,
    SelectField,
    Tabs,
    TextField,
    useToast,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Check, Copy, CreditCard, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

interface CredentialField {
    key: string;
    label: string;
    secret: boolean;
    optional?: boolean;
}

interface ProviderMeta {
    label: string;
    capabilities: string[];
    recurring: boolean;
    price_mapping: boolean;
    credential_fields: CredentialField[];
}

interface GatewayConfig {
    id: number;
    name: string;
    provider: string;
    provider_label: string;
    environment: string;
    is_enabled: boolean;
    is_default: boolean;
    supported_currencies: string[];
    allowed_countries: string[];
    capabilities: string[];
    credential_keys: string[];
    recurring: boolean;
    is_ready: boolean;
    health_status: string | null;
    last_ok_at: string | null;
    last_error: string | null;
    plan_ids: string[];
    webhook_url: string;
}

interface Option {
    value: string;
    label: string;
}

const HEALTH_TONE: Record<string, BadgeTone> = { ok: 'success', error: 'danger' };

function MultiCheck({
    title,
    options,
    selected,
    onToggle,
    scroll = false,
    mono = false,
}: {
    title: string;
    options: Option[];
    selected: string[];
    onToggle: (value: string) => void;
    scroll?: boolean;
    mono?: boolean;
}) {
    return (
        <div>
            <span className="mb-1.5 block text-xs font-semibold text-foreground tracking-tight">{title}</span>
            <div
                className={cn(
                    'flex gap-x-3 gap-y-2 rounded-md border border-border bg-background p-3',
                    scroll ? 'max-h-48 flex-col flex-nowrap overflow-y-auto' : 'flex-wrap',
                )}
            >
                {options.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground/80">
                        <input
                            type="checkbox"
                            checked={selected.includes(option.value)}
                            onChange={() => onToggle(option.value)}
                            className="h-4 w-4 rounded border-input text-primary shadow-xs focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className={mono ? 'font-mono' : undefined}>{option.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

export default function GatewaysIndex({
    gateways,
    provider_filter,
    providers,
    provider_labels,
    provider_schema,
    required_credentials,
    capabilities,
    currencies,
    countries,
    plans,
}: {
    gateways: GatewayConfig[];
    provider_filter: string | null;
    providers: string[];
    provider_labels: Record<string, string>;
    provider_schema: Record<string, ProviderMeta>;
    required_credentials: Record<string, string[]>;
    capabilities: Option[];
    currencies: Option[];
    countries: Option[];
    plans: Option[];
}) {
    const { push: pushToast } = useToast();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<GatewayConfig | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<GatewayConfig | null>(null);
    const [copied, setCopied] = useState<number | null>(null);

    const form = useForm({
        name: '',
        provider: providers[0] ?? 'manual',
        environment: 'sandbox',
        is_enabled: true,
        supported_currencies: [] as string[],
        allowed_countries: [] as string[],
        capabilities: [] as string[],
        plan_ids: [] as string[],
        credentials: {} as Record<string, string>,
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({
            name: '',
            provider: provider_filter ?? providers[0] ?? 'manual',
            environment: 'sandbox',
            is_enabled: true,
            supported_currencies: [],
            allowed_countries: [],
            capabilities: [],
            plan_ids: [],
            credentials: {},
        });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (gateway: GatewayConfig) => {
        setEditing(gateway);
        form.setData({
            name: gateway.name,
            provider: gateway.provider,
            environment: gateway.environment,
            is_enabled: gateway.is_enabled,
            supported_currencies: gateway.supported_currencies,
            allowed_countries: gateway.allowed_countries,
            capabilities: gateway.capabilities,
            plan_ids: gateway.plan_ids,
            credentials: {},
        });
        form.clearErrors();
        setOpen(true);
    };

    const toggleIn = (key: 'supported_currencies' | 'allowed_countries' | 'capabilities' | 'plan_ids', value: string) => {
        const current = form.data[key];
        form.setData(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => { setOpen(false); setEditing(null); } };
        form.transform((data) => ({
            ...data,
            plan_ids: data.plan_ids.map((id) => Number(id)),
        }));
        if (editing) {
            form.patch(route('platform.gateways.update', editing.id), options);
        } else {
            form.post(route('platform.gateways.store'), options);
        }
    };

    const copyWebhook = async (gateway: GatewayConfig) => {
        try {
            await navigator.clipboard.writeText(gateway.webhook_url);
            setCopied(gateway.id);
            setTimeout(() => setCopied(null), 1500);
        } catch {
            pushToast('error', `Could not copy the webhook URL: ${gateway.webhook_url}`);
        }
    };

    const credentialFields = provider_schema[form.data.provider]?.credential_fields ?? [];
    const providerMeta = provider_schema[form.data.provider];

    return (
        <PlatformLayout
            title={provider_filter ? provider_labels[provider_filter] ?? 'Payment Gateways' : 'Payment Gateways'}
            description="Named gateway configurations used to collect subscription payments. Several may be enabled at once; one is the default. A payment is only marked successful after server-side verification."
            actions={
                <Button size="sm" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                    Add Gateway
                </Button>
            }
        >
            <Tabs
                tabs={[{ key: '', label: 'All' }, ...providers.map((p) => ({ key: p, label: provider_labels[p] ?? p }))]}
                value={provider_filter ?? ''}
                onChange={(key) => router.get(route('platform.gateways.index'), key ? { provider: key } : {}, { preserveScroll: true })}
                className="mb-5"
            />

            {gateways.length === 0 ? (
                <Card>
                    <EmptyState
                        title="No gateways configured"
                        description="Add a payment gateway integration to start accepting online subscription payments."
                        action={
                            <Button size="sm" onClick={openCreate}>
                                Add Gateway
                            </Button>
                        }
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {gateways.map((gateway) => (
                        <Card key={gateway.id}>
                            <CardBody className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">{gateway.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {gateway.provider_label} · <span className="capitalize">{gateway.environment}</span>
                                            {gateway.recurring && ' · recurring'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                        {gateway.is_default && <Badge tone="info">Default</Badge>}
                                        <Badge tone={gateway.is_enabled ? 'success' : 'neutral'}>{gateway.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                                        {gateway.is_ready ? (
                                            <Badge tone="success">Ready</Badge>
                                        ) : gateway.health_status ? (
                                            <Badge tone={HEALTH_TONE[gateway.health_status] ?? 'neutral'}>
                                                {gateway.health_status === 'ok' ? 'Meta OK' : 'Config error'}
                                            </Badge>
                                        ) : (
                                            <Badge tone="warning">Not verified</Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Currencies</span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {gateway.supported_currencies.length === 0 ? (
                                                <span className="text-muted-foreground/70">All</span>
                                            ) : (
                                                gateway.supported_currencies.map((c) => (
                                                    <span key={c} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">{c}</span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Countries</span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {gateway.allowed_countries.length === 0 ? (
                                                <span className="text-muted-foreground/70">All</span>
                                            ) : (
                                                gateway.allowed_countries.map((c) => (
                                                    <span key={c} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">{c}</span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    Credentials:{' '}
                                    {(provider_schema[gateway.provider]?.credential_fields ?? []).map((field) => (
                                        <span
                                            key={field.key}
                                            className={cn(
                                                'mr-1.5 font-medium',
                                                gateway.credential_keys.includes(field.key) ? 'text-emerald-600' : field.optional ? 'text-muted-foreground/70' : 'text-destructive',
                                            )}
                                        >
                                            {field.label}
                                        </span>
                                    ))}
                                    {(provider_schema[gateway.provider]?.credential_fields ?? []).length === 0 && (
                                        <span className="text-muted-foreground/70">None required</span>
                                    )}
                                </div>

                                {gateway.last_error && <p className="text-xs text-destructive">{gateway.last_error}</p>}

                                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
                                    <span className="truncate font-mono text-[11px] text-muted-foreground" title={gateway.webhook_url}>
                                        {gateway.webhook_url}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyWebhook(gateway)}
                                        aria-label="Copy webhook URL"
                                        className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    >
                                        {copied === gateway.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                                    <Button size="xs" variant="outline" onClick={() => router.post(route('platform.gateways.toggle', gateway.id), {}, { preserveScroll: true })}>
                                        {gateway.is_enabled ? 'Disable' : 'Enable'}
                                    </Button>
                                    {!gateway.is_default && gateway.is_enabled && (
                                        <Button size="xs" variant="outline" onClick={() => router.post(route('platform.gateways.default', gateway.id), {}, { preserveScroll: true })}>
                                            Set Default
                                        </Button>
                                    )}
                                    <Button size="xs" variant="outline" onClick={() => router.post(route('platform.gateways.test', gateway.id), {}, { preserveScroll: true })}>
                                        Test connection
                                    </Button>
                                    <Button size="xs" variant="ghost" onClick={() => openEdit(gateway)}>
                                        Edit
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        className="ml-auto text-destructive hover:bg-destructive/10"
                                        onClick={() => setConfirmDelete(gateway)}
                                        icon={<Trash2 className="h-3.5 w-3.5" />}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Secrets are encrypted at rest and never returned to the browser. Leaving a credential field blank keeps the stored value. A gateway is only
                shown as <span className="font-medium text-foreground">Ready</span> once its required credentials are saved and a connection test has passed.
            </p>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? `Edit ${editing.name}` : 'Add Gateway'}
                footer={
                    <Button size="sm" loading={form.processing} onClick={submit}>
                        {editing ? 'Save Changes' : 'Create Gateway'}
                    </Button>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{providerMeta?.label ?? 'Manual'}</span>
                        {providerMeta?.recurring && <Badge tone="brand">Recurring</Badge>}
                    </div>

                    <TextField
                        label="Configuration name"
                        value={form.data.name}
                        hint="e.g. Paddle Production, bKash Sandbox"
                        error={form.errors.name}
                        onChange={(v) => form.setData('name', v)}
                    />
                    <SelectField
                        label="Provider"
                        value={form.data.provider}
                        options={providers.map((p) => ({ value: p, label: provider_labels[p] ?? p }))}
                        onChange={(v) => form.setData('provider', v)}
                    />
                    <SelectField
                        label="Environment"
                        value={form.data.environment}
                        options={[
                            { value: 'sandbox', label: 'Sandbox (test mode)' },
                            { value: 'production', label: 'Production (live)' },
                        ]}
                        onChange={(v) => form.setData('environment', v)}
                    />

                    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                        <input
                            type="checkbox"
                            checked={form.data.is_enabled}
                            onChange={(e) => form.setData('is_enabled', e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary shadow-xs focus:ring-ring"
                        />
                        Enable this gateway
                    </label>

                    <MultiCheck
                        title="Supported currencies (none = all)"
                        options={currencies}
                        selected={form.data.supported_currencies}
                        onToggle={(v) => toggleIn('supported_currencies', v)}
                    />
                    <MultiCheck
                        title="Allowed countries (none = all)"
                        options={countries}
                        selected={form.data.allowed_countries}
                        onToggle={(v) => toggleIn('allowed_countries', v)}
                        scroll
                    />
                    <MultiCheck
                        title="Payment capabilities"
                        options={capabilities}
                        selected={form.data.capabilities}
                        onToggle={(v) => toggleIn('capabilities', v)}
                    />
                    {plans.length > 0 && (
                        <MultiCheck
                            title="Plans this gateway may collect for (none = all plans)"
                            options={plans}
                            selected={form.data.plan_ids}
                            onToggle={(v) => toggleIn('plan_ids', v)}
                        />
                    )}

                    {credentialFields.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {credentialFields.map((field) => (
                                <label key={field.key} className="block space-y-1">
                                    <span className="block text-xs font-semibold tracking-tight text-foreground">
                                        {field.label}
                                        {field.optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
                                    </span>
                                    <Input
                                        type={field.secret ? 'password' : 'text'}
                                        value={form.data.credentials[field.key] ?? ''}
                                        placeholder={editing?.credential_keys.includes(field.key) ? '•••••••• stored' : 'Not set'}
                                        onChange={(e) => form.setData('credentials', { ...form.data.credentials, [field.key]: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                </label>
                            ))}
                        </div>
                    )}

                    {form.errors.credentials && <p className="text-xs text-destructive">{form.errors.credentials}</p>}
                    {Object.values(form.errors)[0] && !form.errors.credentials && (
                        <p className="text-xs text-destructive">{Object.values(form.errors)[0]}</p>
                    )}
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmDelete !== null}
                title={`Delete ${confirmDelete?.name ?? 'gateway'}?`}
                description="The gateway configuration is permanently deleted. Historical payments and records are preserved."
                confirmLabel="Delete gateway"
                onConfirm={() => {
                    if (confirmDelete) {
                        router.delete(route('platform.gateways.destroy', confirmDelete.id), {
                            preserveScroll: true,
                            onFinish: () => setConfirmDelete(null),
                        });
                    }
                }}
                onClose={() => setConfirmDelete(null)}
            />
        </PlatformLayout>
    );
}
