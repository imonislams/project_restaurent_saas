import { Badge, Button, Card, CardBody, ConfirmDialog, Drawer, EmptyState, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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

interface Option {
    value: string;
    label: string;
}

const HEALTH_TONE: Record<string, BadgeTone> = { ok: 'success', error: 'danger' };

export default function GatewaysIndex({
    gateways,
    provider_filter,
    providers,
    required_credentials,
    currencies,
}: {
    gateways: GatewayConfig[];
    provider_filter: string | null;
    providers: string[];
    required_credentials: Record<string, string[]>;
    currencies: Option[];
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<GatewayConfig | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<GatewayConfig | null>(null);

    const form = useForm({
        name: '',
        provider: providers[0] ?? 'manual',
        environment: 'sandbox',
        is_enabled: true,
        supported_currencies: [] as string[],
        credentials: {} as Record<string, string>,
    });

    const providerLabel = (provider: string) => (provider === 'sslcommerz' ? 'SSLCommerz' : 'Manual (offline)');

    const openCreate = () => {
        setEditing(null);
        form.setData({
            name: '',
            provider: provider_filter ?? providers[0] ?? 'manual',
            environment: 'sandbox',
            is_enabled: true,
            supported_currencies: [],
            credentials: {},
        });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (gateway: GatewayConfig) => {
        setEditing(gateway);
        form.setData({
            name: gateway.provider === 'manual' ? gateway.name : gateway.name,
            provider: gateway.provider,
            environment: gateway.environment,
            is_enabled: gateway.is_enabled,
            supported_currencies: gateway.supported_currencies,
            credentials: {},
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => { setOpen(false); setEditing(null); } };
        if (editing) {
            form.patch(route('platform.gateways.update', editing.id), options);
        } else {
            form.post(route('platform.gateways.store'), options);
        }
    };

    const credentialFields = required_credentials[form.data.provider] ?? [];

    return (
        <PlatformLayout
            title={provider_filter === 'sslcommerz' ? 'SSLCommerz' : 'Payment Gateways'}
            description="Named gateway configurations used to collect subscription payments. Several may be enabled at once; one is the default. A payment is only marked successful after server-side verification."
            actions={<Button size="sm" onClick={openCreate}>Add gateway</Button>}
        >
            {gateways.length === 0 ? (
                <Card>
                    <EmptyState title="No gateways configured" description="Add a gateway to start collecting payments." action={<Button size="sm" onClick={openCreate}>Add gateway</Button>} />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {gateways.map((gateway) => (
                        <Card key={gateway.id}>
                            <CardBody className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-semibold text-gray-900">{gateway.name}</h3>
                                        <p className="text-xs text-gray-400">{providerLabel(gateway.provider)} · {gateway.environment}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                        {gateway.is_default && <Badge tone="info">Default</Badge>}
                                        <Badge tone={gateway.is_enabled ? 'success' : 'neutral'}>{gateway.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                                        {gateway.health_status && <Badge tone={HEALTH_TONE[gateway.health_status] ?? 'neutral'}>{gateway.health_status === 'ok' ? 'Config OK' : 'Config error'}</Badge>}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {gateway.supported_currencies.length === 0 ? (
                                        <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-inset ring-gray-200">All currencies</span>
                                    ) : (
                                        gateway.supported_currencies.map((currency) => (
                                            <span key={currency} className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 ring-1 ring-inset ring-gray-200">{currency}</span>
                                        ))
                                    )}
                                </div>

                                <div className="text-xs text-gray-500">
                                    Credentials:{' '}
                                    {(required_credentials[gateway.provider] ?? []).map((key) => (
                                        <span key={key} className={gateway.credential_keys.includes(key) ? 'text-emerald-600' : 'text-red-500'}>
                                            {key.replace(/_/g, ' ')}{' '}
                                        </span>
                                    ))}
                                    {(required_credentials[gateway.provider] ?? []).length === 0 && <span className="text-gray-400">none required</span>}
                                </div>

                                {gateway.last_error && <p className="text-xs text-red-600">{gateway.last_error}</p>}

                                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs">
                                    <button onClick={() => router.post(route('platform.gateways.toggle', gateway.id), {}, { preserveScroll: true })} className="font-medium text-gray-600 hover:text-gray-800">
                                        {gateway.is_enabled ? 'Disable' : 'Enable'}
                                    </button>
                                    {!gateway.is_default && gateway.is_enabled && (
                                        <button onClick={() => router.post(route('platform.gateways.default', gateway.id), {}, { preserveScroll: true })} className="font-medium text-indigo-600 hover:text-indigo-700">
                                            Set default
                                        </button>
                                    )}
                                    <button onClick={() => router.post(route('platform.gateways.test', gateway.id), {}, { preserveScroll: true })} className="font-medium text-gray-600 hover:text-gray-800">
                                        Test
                                    </button>
                                    <button onClick={() => openEdit(gateway)} className="font-medium text-indigo-600 hover:text-indigo-700">
                                        Edit
                                    </button>
                                    <button onClick={() => setConfirmDelete(gateway)} className="ml-auto font-medium text-red-600 hover:text-red-700">
                                        Delete
                                    </button>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            <p className="mt-4 text-xs text-gray-400">Secrets are encrypted at rest and never returned to the browser. Leaving a credential field blank keeps the stored value.</p>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? `Edit ${editing.name}` : 'Add gateway'}
                footer={<Button size="sm" loading={form.processing} onClick={submit}>{editing ? 'Save gateway' : 'Create gateway'}</Button>}
            >
                <form onSubmit={submit} className="space-y-4">
                    <TextField label="Name" value={form.data.name} hint="e.g. SSLCommerz BDT (production)" error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                    <SelectField label="Provider" value={form.data.provider} options={providers.map((p) => ({ value: p, label: providerLabel(p) }))} onChange={(v) => form.setData('provider', v)} />
                    <SelectField label="Environment" value={form.data.environment} options={[{ value: 'sandbox', label: 'Sandbox' }, { value: 'production', label: 'Production' }]} onChange={(v) => form.setData('environment', v)} />

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={form.data.is_enabled} onChange={(e) => form.setData('is_enabled', e.target.checked)} className="rounded border-gray-300" />
                        Enabled
                    </label>

                    <div>
                        <span className="mb-1.5 block text-xs font-medium text-gray-600">Supported currencies (empty = all)</span>
                        <div className="flex flex-wrap gap-3">
                            {currencies.map((currency) => (
                                <label key={currency.value} className="flex items-center gap-1.5 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={form.data.supported_currencies.includes(currency.value)}
                                        onChange={(e) => form.setData('supported_currencies', e.target.checked ? [...form.data.supported_currencies, currency.value] : form.data.supported_currencies.filter((c) => c !== currency.value))}
                                        className="rounded border-gray-300"
                                    />
                                    {currency.value}
                                </label>
                            ))}
                        </div>
                    </div>

                    {credentialFields.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {credentialFields.map((key) => (
                                <label key={key} className="block">
                                    <span className="mb-1.5 block text-xs font-medium text-gray-600">{key.replace(/_/g, ' ')}</span>
                                    <input
                                        type="password"
                                        value={form.data.credentials[key] ?? ''}
                                        placeholder={editing?.credential_keys.includes(key) ? '•••••• stored' : 'Not set'}
                                        onChange={(e) => form.setData('credentials', { ...form.data.credentials, [key]: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500/30"
                                    />
                                </label>
                            ))}
                        </div>
                    )}

                    {form.errors.credentials && <p className="text-xs text-red-600">{form.errors.credentials}</p>}
                    {Object.values(form.errors)[0] && !form.errors.credentials && <p className="text-xs text-red-600">{Object.values(form.errors)[0]}</p>}
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmDelete !== null}
                title={`Delete ${confirmDelete?.name ?? 'gateway'}?`}
                description="The configuration is removed. Historical payments are not affected."
                confirmLabel="Delete gateway"
                onConfirm={() => {
                    if (confirmDelete) router.delete(route('platform.gateways.destroy', confirmDelete.id), { preserveScroll: true, onFinish: () => setConfirmDelete(null) });
                }}
                onClose={() => setConfirmDelete(null)}
            />
        </PlatformLayout>
    );
}
