import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Input, SelectField, Switch, Tabs, TextField, useToast } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import { Check, Copy, CreditCard, Trash2 } from 'lucide-react';
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
            <span className="mb-1.5 block text-xs font-semibold tracking-tight text-foreground">{title}</span>
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
    const [active, setActive] = useState(provider_filter && providers.includes(provider_filter) ? provider_filter : providers[0] ?? 'manual');
    const [confirmDelete, setConfirmDelete] = useState<GatewayConfig | null>(null);
    const [copied, setCopied] = useState<number | null>(null);

    const form = useForm({
        name: '',
        environment: 'sandbox',
        supported_currencies: [] as string[],
        allowed_countries: [] as string[],
        capabilities: [] as string[],
        plan_ids: [] as string[],
        credentials: {} as Record<string, string>,
    });

    const meta = provider_schema[active];
    const configs = gateways.filter((gateway) => gateway.provider === active);
    const primary = configs.find((gateway) => gateway.is_enabled) ?? configs.find((gateway) => gateway.is_default) ?? configs[0] ?? null;
    const extras = configs.filter((gateway) => gateway.id !== primary?.id);

    const load = (gateway: GatewayConfig | null) => {
        form.setData({
            name: gateway?.name ?? '',
            environment: gateway?.environment ?? 'sandbox',
            supported_currencies: gateway?.supported_currencies ?? [],
            allowed_countries: gateway?.allowed_countries ?? [],
            capabilities: gateway?.capabilities ?? [],
            plan_ids: gateway?.plan_ids ?? [],
            credentials: {},
        });
        form.clearErrors();
    };

    // One tab = one gateway: seed the form from that gateway's configuration.
    useEffect(() => {
        load(primary);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const toggleIn = (key: 'supported_currencies' | 'allowed_countries' | 'capabilities' | 'plan_ids', value: string) => {
        const current = form.data[key];
        form.setData(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => form.setData('credentials', {}),
        };

        form.transform((data) => ({
            ...data,
            provider: active,
            plan_ids: data.plan_ids.map((id) => Number(id)),
        }));

        if (primary) {
            form.patch(route('platform.gateways.update', primary.id), options);
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

    const visibility = primary?.is_enabled
        ? `Shown to customers on plan change — ${primary.supported_currencies.length > 0 ? primary.supported_currencies.join(', ') : 'all currencies'} invoices · ${
              primary.allowed_countries.length > 0 ? primary.allowed_countries.join(', ') : 'all countries'
          }${primary.plan_ids.length > 0 ? ' · selected plans only' : ' · all plans'}.`
        : 'Hidden from customers — plan upgrades and downgrades will not offer this gateway.';

    return (
        <PlatformLayout
            title="Payment Gateways"
            description="One tab per gateway. Switch a gateway on to offer it to customers when they upgrade or downgrade their plan; switch it off and it disappears from their checkout. Credentials are encrypted at rest."
        >
            <Tabs
                tabs={providers.map((provider) => ({ key: provider, label: provider_labels[provider] ?? provider }))}
                value={active}
                onChange={setActive}
                className="mb-5"
            />

            <Card>
                <CardHeader
                    title={meta?.label ?? active}
                    description={primary ? (primary.name || 'Saved configuration') : 'Not configured yet — fill in the details below and save.'}
                    action={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {primary && (
                                <>
                                    <Badge tone={primary.is_enabled ? 'success' : 'neutral'}>{primary.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                                    {primary.is_ready ? (
                                        <Badge tone="success">Ready</Badge>
                                    ) : primary.health_status ? (
                                        <Badge tone={HEALTH_TONE[primary.health_status] ?? 'neutral'}>
                                            {primary.health_status === 'ok' ? 'Meta OK' : 'Config error'}
                                        </Badge>
                                    ) : (
                                        <Badge tone="warning">Not verified</Badge>
                                    )}
                                    {primary.is_default && <Badge tone="info">Default</Badge>}
                                </>
                            )}
                            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                                <Switch
                                    checked={primary?.is_enabled ?? false}
                                    disabled={!primary}
                                    onCheckedChange={() => primary && router.post(route('platform.gateways.toggle', primary.id), {}, { preserveScroll: true })}
                                    aria-label="Offer this gateway to customers"
                                />
                                <span className="text-xs font-medium text-foreground">Offer to customers</span>
                            </div>
                        </div>
                    }
                />
                <CardBody className="space-y-5">
                    <div
                        className={cn(
                            'rounded-md border px-3 py-2 text-xs',
                            primary?.is_enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900',
                        )}
                    >
                        {visibility}
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TextField
                                label="Configuration name"
                                value={form.data.name}
                                hint="Optional — e.g. SSLCommerz Live"
                                error={form.errors.name}
                                onChange={(value) => form.setData('name', value)}
                            />
                            <SelectField
                                label="Environment"
                                value={form.data.environment}
                                options={[
                                    { value: 'sandbox', label: 'Sandbox (test mode)' },
                                    { value: 'production', label: 'Production (live)' },
                                ]}
                                onChange={(value) => form.setData('environment', value)}
                            />
                        </div>

                        {(meta?.credential_fields ?? []).length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {(meta?.credential_fields ?? []).map((field) => (
                                    <label key={field.key} className="block space-y-1">
                                        <span className="block text-xs font-semibold tracking-tight text-foreground">
                                            {field.label}
                                            {field.optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : <span className="ml-1 text-destructive">*</span>}
                                        </span>
                                        <Input
                                            type={field.secret ? 'password' : 'text'}
                                            value={form.data.credentials[field.key] ?? ''}
                                            placeholder={primary?.credential_keys.includes(field.key) ? '•••••••• stored' : 'Not set'}
                                            onChange={(event) => form.setData('credentials', { ...form.data.credentials, [field.key]: event.target.value })}
                                            className="font-mono text-xs"
                                        />
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">This gateway needs no credentials — an administrator settles the payment from the payments screen.</p>
                        )}

                        <MultiCheck
                            title="Supported currencies (none = all)"
                            options={currencies}
                            selected={form.data.supported_currencies}
                            onToggle={(value) => toggleIn('supported_currencies', value)}
                        />
                        <MultiCheck
                            title="Allowed countries (none = all)"
                            options={countries}
                            selected={form.data.allowed_countries}
                            onToggle={(value) => toggleIn('allowed_countries', value)}
                            scroll
                        />
                        <MultiCheck
                            title="Payment capabilities"
                            options={capabilities}
                            selected={form.data.capabilities}
                            onToggle={(value) => toggleIn('capabilities', value)}
                        />
                        {plans.length > 0 && (
                            <MultiCheck
                                title="Plans this gateway may collect for (none = all plans)"
                                options={plans}
                                selected={form.data.plan_ids}
                                onToggle={(value) => toggleIn('plan_ids', value)}
                            />
                        )}

                        {form.errors.credentials && <p className="text-xs text-destructive">{form.errors.credentials}</p>}
                        {Object.values(form.errors)[0] && !form.errors.credentials && (
                            <p className="text-xs text-destructive">{Object.values(form.errors)[0]}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                            <Button type="submit" size="sm" loading={form.processing}>
                                {primary ? 'Save changes' : 'Save configuration'}
                            </Button>
                            {primary && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.post(route('platform.gateways.test', primary.id), {}, { preserveScroll: true })}
                                >
                                    Test connection
                                </Button>
                            )}
                            {primary && primary.is_enabled && !primary.is_default && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.post(route('platform.gateways.default', primary.id), {}, { preserveScroll: true })}
                                >
                                    Make default
                                </Button>
                            )}
                            {primary && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="ml-auto text-destructive hover:bg-destructive/10"
                                    onClick={() => setConfirmDelete(primary)}
                                    icon={<Trash2 className="h-3.5 w-3.5" />}
                                >
                                    Delete configuration
                                </Button>
                            )}
                        </div>
                    </form>

                    {primary && (
                        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
                            <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono text-[11px] text-muted-foreground" title={primary.webhook_url}>
                                {primary.webhook_url}
                            </span>
                            <button
                                type="button"
                                onClick={() => copyWebhook(primary)}
                                aria-label="Copy webhook URL"
                                className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                                {copied === primary.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    )}

                    {primary?.last_error && <p className="text-xs text-destructive">{primary.last_error}</p>}

                    {extras.length > 0 && (
                        <div className="rounded-md border border-border bg-muted/20 p-3">
                            <p className="text-xs font-semibold text-foreground">
                                {extras.length} other saved configuration{extras.length > 1 ? 's' : ''} for this gateway
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Left over from the old "Add Gateway" screen — anything enabled here is also offered to customers.
                            </p>
                            <div className="mt-2 space-y-2">
                                {extras.map((gateway) => (
                                    <div key={gateway.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                                        <span className="text-xs font-medium text-foreground">{gateway.name || `#${gateway.id}`}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {gateway.environment} · {gateway.is_enabled ? 'enabled' : 'disabled'}
                                        </span>
                                        <div className="ml-auto flex gap-1.5">
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={() => router.post(route('platform.gateways.toggle', gateway.id), {}, { preserveScroll: true })}
                                            >
                                                {gateway.is_enabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button type="button" size="xs" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(gateway)}>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        Secrets are encrypted at rest and never returned to the browser. Leaving a credential field blank keeps the stored value. A
                        gateway is only shown as <span className="font-medium text-foreground">Ready</span> once its required credentials are saved and a
                        connection test has passed.
                    </p>
                </CardBody>
            </Card>

            <ConfirmDialog
                show={confirmDelete !== null}
                title={`Delete ${confirmDelete?.name || 'this configuration'}?`}
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
