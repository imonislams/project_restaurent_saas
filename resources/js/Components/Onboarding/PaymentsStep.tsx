import StepFooter from '@/Components/Onboarding/StepFooter';
import { CheckboxField, FormSection, Input, SelectField } from '@/Components/ui';
import type { SettingsOptions } from '@/Components/Settings/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface ProviderField {
    key: string;
    label: string;
    secret?: boolean;
}

interface Provider {
    label: string;
    fields: ProviderField[];
}

interface GatewayInput {
    provider: string;
    environment: string;
    is_enabled: boolean;
    supported_currencies: string[];
    credentials: Record<string, string>;
}

interface ExistingGateway {
    provider: string;
    environment: string;
    is_enabled: boolean;
    supported_currencies: string[];
    credential_keys: string[];
}

interface Props {
    form: {
        gateways?: ExistingGateway[];
        default_provider?: string | null;
        accept_cash?: boolean;
    };
    options: SettingsOptions & { gateway_schema?: Record<string, Provider>; gateway_providers?: string[] };
}

export default function PaymentsStep({ form, options }: Props) {
    const schema = options.gateway_schema ?? {};
    const providers = options.gateway_providers ?? Object.keys(schema);

    const storedKeys: Record<string, string[]> = {};
    (form.gateways ?? []).forEach((gateway) => {
        storedKeys[gateway.provider] = gateway.credential_keys ?? [];
    });

    const enabled = (form.gateways ?? []).filter((gateway) => gateway.is_enabled);

    const initial: GatewayInput[] = enabled.map((gateway) => ({
        provider: gateway.provider,
        environment: gateway.environment ?? 'sandbox',
        is_enabled: true,
        supported_currencies: gateway.supported_currencies ?? [],
        credentials: {},
    }));

    const { data, setData, post, processing, errors } = useForm<{ gateways: GatewayInput[]; default_provider: string | null }>({
        // The form data is the submission payload: only enabled gateways are held.
        gateways: initial.length > 0 ? initial : [{ provider: 'cash', environment: 'sandbox', is_enabled: true, supported_currencies: [], credentials: {} }],
        default_provider: form.default_provider ?? initial[0]?.provider ?? 'cash',
    });

    const toggle = (provider: string, on: boolean) => {
        if (on) {
            setData('gateways', [
                ...data.gateways,
                { provider, environment: 'sandbox', is_enabled: true, supported_currencies: [], credentials: {} },
            ]);

            return;
        }

        const remaining = data.gateways.filter((gateway) => gateway.provider !== provider);
        setData('gateways', remaining);

        if (data.default_provider === provider) {
            setData('default_provider', remaining[0]?.provider ?? null);
        }
    };

    const update = (provider: string, patch: Partial<GatewayInput>) => {
        setData('gateways', data.gateways.map((gateway) => (gateway.provider === provider ? { ...gateway, ...patch } : gateway)));
    };

    const setCredential = (provider: string, key: string, value: string) => {
        const entry = data.gateways.find((gateway) => gateway.provider === provider);
        update(provider, { credentials: { ...(entry?.credentials ?? {}), [key]: value } });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.payments'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <FormSection
                title="How you take payment"
                description="Enable every method you accept — you can take several at once. Online gateways are verified server-side before an order is marked paid."
            >
                <div className="space-y-3">
                    {providers.map((provider) => {
                        const meta = schema[provider] ?? { label: provider, fields: [] };
                        const entry = data.gateways.find((gateway) => gateway.provider === provider);
                        const isOn = Boolean(entry);

                        return (
                            <div key={provider} className="rounded-lg border border-border/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <CheckboxField label={meta.label} checked={isOn} onChange={(v) => toggle(provider, v)} />
                                    {isOn && (
                                        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <input
                                                type="radio"
                                                name="default_provider"
                                                checked={data.default_provider === provider}
                                                onChange={() => setData('default_provider', provider)}
                                                className="h-3.5 w-3.5"
                                            />
                                            Default
                                        </label>
                                    )}
                                </div>

                                {isOn && meta.fields.length > 0 && (
                                    <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
                                        <SelectField
                                            label="Environment"
                                            value={entry!.environment}
                                            options={[
                                                { value: 'sandbox', label: 'Sandbox (test mode)' },
                                                { value: 'production', label: 'Production (live)' },
                                            ]}
                                            onChange={(v) => update(provider, { environment: v })}
                                        />
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {meta.fields.map((field) => (
                                                <label key={field.key} className="block space-y-1">
                                                    <span className="block text-xs font-semibold tracking-tight text-foreground">{field.label}</span>
                                                    <Input
                                                        type={field.secret ? 'password' : 'text'}
                                                        value={entry!.credentials[field.key] ?? ''}
                                                        placeholder={(storedKeys[provider] ?? []).includes(field.key) ? '•••••••• stored' : 'Not set'}
                                                        onChange={(e) => setCredential(provider, field.key, e.target.value)}
                                                        className={field.secret ? 'font-mono text-xs' : ''}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {errors.gateways && <p className="text-xs text-destructive">{errors.gateways}</p>}
            </FormSection>
            <StepFooter processing={processing} onSkip={() => post(route('onboarding.skip', 'payments'))} />
        </form>
    );
}
