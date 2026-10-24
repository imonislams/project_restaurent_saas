import { Badge, Button, Card, CheckboxField, FormSection, PageHeader, SelectField, TextField } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Option {
    value: string;
    label: string;
}

interface ProviderPrice {
    product_id?: string;
    price_id?: string;
}

interface ExtraPrice {
    currency: string;
    interval: string;
    price: string;
}

interface PlanRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    currency: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    features: string[];
    limits: Record<string, number | null>;
    is_active: boolean;
    visibility: string;
    region: string;
    region_label?: string;
    is_featured: boolean;
    version: number;
    archived: boolean;
    subscriptions_count: number;
    prices: { currency: string; interval: string; price: number; provider_prices?: Record<string, ProviderPrice> }[];
    gateway_ids: string[];
}

interface LimitKey {
    key: string;
    label: string;
    hint: string;
}

const priceKey = (currency: string, interval: string) => `${currency}|${interval}`;

export default function PlanForm({
    plan,
    currencies,
    default_currency,
    feature_options,
    limit_keys,
    gateways,
    price_providers,
    regions,
    region_currencies,
}: {
    plan: PlanRow | null;
    currencies: Option[];
    enabled_currencies: string[];
    default_currency: string;
    feature_options: Option[];
    limit_keys: LimitKey[];
    gateways: Option[];
    price_providers: Option[];
    regions: Option[];
    region_currencies: Record<string, string>;
}) {
    const editing = plan !== null;
    const initialRegion = plan?.region ?? 'international';
    const initialCurrency = plan?.currency ?? region_currencies[initialRegion] ?? default_currency ?? currencies[0]?.value ?? 'USD';

    const [extraPrices, setExtraPrices] = useState<ExtraPrice[]>(
        plan
            ? plan.prices.filter((p) => p.currency !== plan.currency).map((p) => ({ currency: p.currency, interval: p.interval, price: String(p.price) }))
            : [],
    );

    const [providerPrices, setProviderPrices] = useState<Record<string, Record<string, ProviderPrice>>>(
        Object.fromEntries((plan?.prices ?? []).map((p) => [priceKey(p.currency, p.interval), p.provider_prices ?? {}])),
    );

    const form = useForm({
        name: plan?.name ?? '',
        slug: plan?.slug ?? '',
        description: plan?.description ?? '',
        currency: initialCurrency,
        visibility: plan?.visibility ?? 'public',
        region: initialRegion,
        is_featured: plan?.is_featured ?? false,
        price_monthly: plan?.price_monthly ?? 0,
        price_yearly: plan?.price_yearly ?? 0,
        trial_days: plan?.trial_days ?? 14,
        is_active: plan?.is_active ?? true,
        features: (plan?.features ?? []) as string[],
        gateways: (plan?.gateway_ids ?? []) as string[],
        limits_branches: (plan?.limits?.branches ?? '') as number | '',
        limits_users: (plan?.limits?.users ?? '') as number | '',
        limits_orders: (plan?.limits?.orders_this_month ?? '') as number | '',
        unlimited_branches: plan?.limits?.branches === null,
        unlimited_users: plan?.limits?.users === null,
        unlimited_orders: plan?.limits?.orders_this_month === null,
    });

    const toggleFeature = (value: string) => {
        const current: string[] = form.data.features ?? [];
        form.setData('features', current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    const toggleGateway = (value: string) => {
        const current: string[] = form.data.gateways ?? [];
        form.setData('gateways', current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    // A plan's price currency is tied to its region (Bangladesh ⇒ BDT,
    // International ⇒ USD), so switching the region switches the currency.
    const changeRegion = (value: string) => {
        const nextCurrency = region_currencies[value];
        form.setData({ ...form.data, region: value, ...(nextCurrency ? { currency: nextCurrency } : {}) });
    };

    const setProviderPrice = (currency: string, interval: string, provider: string, field: 'product_id' | 'price_id', value: string) => {
        const key = priceKey(currency, interval);
        setProviderPrices((state) => ({
            ...state,
            [key]: { ...(state[key] ?? {}), [provider]: { ...(state[key]?.[provider] ?? {}), [field]: value } },
        }));
    };

    const pricesFor = (currency: string, interval: string) => {
        const row = providerPrices[priceKey(currency, interval)] ?? {};
        const cleaned: Record<string, ProviderPrice> = {};
        Object.entries(row).forEach(([provider, value]) => {
            const productId = value.product_id?.trim();
            const priceId = value.price_id?.trim();
            if (productId || priceId) {
                cleaned[provider] = { product_id: productId ?? '', price_id: priceId ?? '' };
            }
        });
        return cleaned;
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const rows = [
            { currency: form.data.currency, interval: 'monthly', price: Number(form.data.price_monthly) },
            { currency: form.data.currency, interval: 'yearly', price: Number(form.data.price_yearly) },
            ...extraPrices
                .filter((p) => p.currency && p.price !== '')
                .map((p) => ({ currency: p.currency, interval: p.interval, price: Number(p.price) })),
        ];

        form.transform((data) => ({
            name: data.name,
            slug: data.slug,
            description: data.description,
            currency: data.currency,
            visibility: data.visibility,
            region: data.region,
            is_featured: data.is_featured,
            price_monthly: data.price_monthly,
            price_yearly: data.price_yearly,
            trial_days: data.trial_days,
            is_active: data.is_active,
            features: data.features,
            gateways: data.gateways.map((id) => Number(id)),
            limits: {
                branches: data.unlimited_branches ? null : data.limits_branches === '' ? null : Number(data.limits_branches),
                users: data.unlimited_users ? null : data.limits_users === '' ? null : Number(data.limits_users),
                orders_this_month: data.unlimited_orders ? null : data.limits_orders === '' ? null : Number(data.limits_orders),
            },
            prices: rows.map((row) => ({ ...row, provider_prices: pricesFor(row.currency, row.interval) })),
        }));

        if (editing) {
            form.patch(route('platform.plans.update', plan.id));
        } else {
            form.post(route('platform.plans.store'));
        }
    };

    const limitState = (key: string) => {
        if (key === 'branches') return { value: form.data.limits_branches, unlimited: form.data.unlimited_branches, setValue: 'limits_branches', setUnlimited: 'unlimited_branches' } as const;
        if (key === 'users') return { value: form.data.limits_users, unlimited: form.data.unlimited_users, setValue: 'limits_users', setUnlimited: 'unlimited_users' } as const;
        return { value: form.data.limits_orders, unlimited: form.data.unlimited_orders, setValue: 'limits_orders', setUnlimited: 'unlimited_orders' } as const;
    };

    const priceRows = [
        { currency: form.data.currency, interval: 'monthly', label: 'Monthly' },
        { currency: form.data.currency, interval: 'yearly', label: 'Yearly' },
        ...extraPrices.map((p) => ({ currency: p.currency, interval: p.interval, label: p.currency })),
    ];

    return (
        <PlatformLayout title={editing ? `Edit ${plan.name}` : 'New plan'}>
            <Head title={editing ? `Edit ${plan.name}` : 'New plan'} />

            <div className="space-y-5">
                <PageHeader
                    title={editing ? `Edit ${plan.name}` : 'New plan'}
                    breadcrumb={[{ label: 'Plans', href: route('platform.plans.index') }, { label: editing ? plan.name : 'New plan' }]}
                    description={editing ? `Version ${plan.version} · editing bumps the version; existing subscriptions keep their captured terms.` : 'Define pricing, limits and which modules the plan entitles.'}
                    actions={
                        <>
                            <Button variant="secondary" href={route('platform.plans.index')}>Cancel</Button>
                            <Button loading={form.processing} onClick={submit}>{editing ? 'Save plan' : 'Create plan'}</Button>
                        </>
                    }
                />

                <form onSubmit={submit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="space-y-5 lg:col-span-2">
                        <FormSection title="Basics" description="How the plan is identified.">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <TextField label="Name" value={form.data.name} error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                                <TextField label="Slug" value={form.data.slug} error={form.errors.slug} hint="lowercase-unique-id" onChange={(v) => form.setData('slug', v)} />
                                <div className="sm:col-span-2">
                                    <TextField label="Description" value={form.data.description} error={form.errors.description} onChange={(v) => form.setData('description', v)} />
                                </div>
                                <SelectField
                                    label="Region"
                                    value={form.data.region}
                                    options={regions}
                                    hint="Bangladesh visitors see BD plans; everyone else sees International."
                                    onChange={changeRegion}
                                />
                                <SelectField label="Visibility" value={form.data.visibility} options={[{ value: 'public', label: 'Public (shown to tenants)' }, { value: 'hidden', label: 'Hidden (internal only)' }]} onChange={(v) => form.setData('visibility', v)} />
                                <div className="flex flex-col gap-3 pb-1">
                                    <CheckboxField label="Active" hint="Inactive plans cannot be assigned." checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} />
                                    <CheckboxField label="Featured" hint="Highlights this plan on the pricing page." checked={form.data.is_featured} onChange={(v) => form.setData('is_featured', v)} />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection title="Pricing" description="Base price in the plan currency, plus optional prices for other currencies.">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <SelectField
                                    label="Currency"
                                    value={form.data.currency}
                                    options={currencies}
                                    error={form.errors.currency}
                                    hint={`Region currency: ${region_currencies[form.data.region] ?? '—'}`}
                                    onChange={(v) => form.setData('currency', v)}
                                />
                                <TextField label={`Monthly (${form.data.currency})`} type="number" value={String(form.data.price_monthly)} error={form.errors.price_monthly} onChange={(v) => form.setData('price_monthly', Number(v))} />
                                <TextField label={`Yearly (${form.data.currency})`} type="number" value={String(form.data.price_yearly)} error={form.errors.price_yearly} onChange={(v) => form.setData('price_yearly', Number(v))} />
                                <TextField label="Trial days" type="number" value={String(form.data.trial_days)} error={form.errors.trial_days} onChange={(v) => form.setData('trial_days', Number(v))} />
                            </div>

                            <div className="rounded-lg border border-border bg-card p-3.5 shadow-2xs">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Additional currency prices</span>
                                    <button type="button" onClick={() => setExtraPrices((p) => [...p, { currency: currencies[0]?.value ?? 'USD', interval: 'monthly', price: '' }])} className="text-xs font-medium text-primary hover:underline">
                                        + Add price
                                    </button>
                                </div>
                                {extraPrices.length === 0 && <p className="text-xs text-muted-foreground">No extra currencies. Tenants billed in a currency without a price fall back to {form.data.currency}.</p>}
                                {extraPrices.map((row, i) => (
                                    <div key={i} className="mb-2 flex flex-wrap items-end gap-2">
                                        <SelectField label="Currency" value={row.currency} options={currencies} onChange={(v) => setExtraPrices((p) => p.map((r, j) => (j === i ? { ...r, currency: v } : r)))} />
                                        <SelectField label="Interval" value={row.interval} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} onChange={(v) => setExtraPrices((p) => p.map((r, j) => (j === i ? { ...r, interval: v } : r)))} />
                                        <TextField label="Price" type="number" className="w-28" value={row.price} onChange={(v) => setExtraPrices((p) => p.map((r, j) => (j === i ? { ...r, price: v } : r)))} />
                                        <Button type="button" size="sm" variant="ghost" onClick={() => setExtraPrices((p) => p.filter((_, j) => j !== i))}>Remove</Button>
                                    </div>
                                ))}
                            </div>
                        </FormSection>

                        {price_providers.length > 0 && (
                            <FormSection title="Provider price mapping" description="Required for Paddle: copy the product and price IDs (pri_…) from your Paddle catalog for each currency/interval. Checkout cannot start without a price ID.">
                                <div className="space-y-3">
                                    {priceRows.map((row) => (
                                        <div key={priceKey(row.currency, row.interval)} className="rounded-lg border border-border bg-card p-3.5 shadow-2xs">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground">{row.currency}</span>
                                                <Badge tone="neutral">{row.label}</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                {price_providers.map((provider) => (
                                                    <div key={provider.value} className="space-y-2 rounded-md border border-border/60 p-2.5">
                                                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{provider.label}</span>
                                                        <TextField
                                                            label="Product ID"
                                                            value={providerPrices[priceKey(row.currency, row.interval)]?.[provider.value]?.product_id ?? ''}
                                                            onChange={(v) => setProviderPrice(row.currency, row.interval, provider.value, 'product_id', v)}
                                                        />
                                                        <TextField
                                                            label="Price ID"
                                                            value={providerPrices[priceKey(row.currency, row.interval)]?.[provider.value]?.price_id ?? ''}
                                                            onChange={(v) => setProviderPrice(row.currency, row.interval, provider.value, 'price_id', v)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </FormSection>
                        )}

                        <FormSection title="Limits" description="Tick “Unlimited” to leave a limit uncapped.">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {limit_keys.map((limit) => {
                                    const state = limitState(limit.key);
                                    return (
                                        <div key={limit.key} className="space-y-2">
                                            <TextField
                                                label={limit.label}
                                                type="number"
                                                hint={limit.hint}
                                                value={String(state.value)}
                                                error={(form.errors as Record<string, string>)[`limits.${limit.key}`]}
                                                onChange={(v) => form.setData(state.setValue as never, (v === '' ? '' : Number(v)) as never)}
                                            />
                                            <CheckboxField label="Unlimited" checked={state.unlimited} onChange={(v) => form.setData(state.setUnlimited as never, v as never)} />
                                        </div>
                                    );
                                })}
                            </div>
                        </FormSection>
                    </div>

                    <div className="space-y-5">
                        <Card>
                            <FormSection title="Included modules" description="What this plan entitles.">
                                <div className="grid grid-cols-1 gap-2">
                                    {feature_options.map((feature) => (
                                        <label
                                            key={feature.value}
                                            className={'flex items-center gap-2.5 rounded-lg border p-3 text-sm cursor-pointer select-none transition ' + (form.data.features.includes(feature.value) ? 'border-primary/50 bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:border-border/80')}
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-input text-primary shadow-2xs focus-visible:ring-1 focus-visible:ring-ring"
                                                checked={form.data.features.includes(feature.value)}
                                                onChange={() => toggleFeature(feature.value)}
                                            />
                                            <span>{feature.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </FormSection>
                        </Card>

                        {gateways.length > 0 && (
                            <Card>
                                <FormSection title="Payment gateways" description="Which gateways may collect for this plan. None selected = all gateways.">
                                    <div className="grid grid-cols-1 gap-2">
                                        {gateways.map((gateway) => (
                                            <label
                                                key={gateway.value}
                                                className={'flex items-center gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer select-none transition ' + (form.data.gateways.includes(gateway.value) ? 'border-primary/50 bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:border-border/80')}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-input text-primary shadow-2xs focus-visible:ring-1 focus-visible:ring-ring"
                                                    checked={form.data.gateways.includes(gateway.value)}
                                                    onChange={() => toggleGateway(gateway.value)}
                                                />
                                                <span>{gateway.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </FormSection>
                            </Card>
                        )}

                        {editing && (
                            <Card className="p-4 text-sm text-muted-foreground">
                                <div className="flex items-center justify-between">
                                    <span>Version</span>
                                    <Badge tone="neutral">v{plan.version}</Badge>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span>Subscribers</span>
                                    <span className="font-semibold text-foreground">{plan.subscriptions_count}</span>
                                </div>
                                <Link href={route('platform.subscriptions.index')} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
                                    View subscriptions →
                                </Link>
                            </Card>
                        )}

                        <Button type="submit" className="w-full" loading={form.processing}>
                            {editing ? 'Save plan' : 'Create plan'}
                        </Button>
                    </div>
                </form>
            </div>
        </PlatformLayout>
    );
}
