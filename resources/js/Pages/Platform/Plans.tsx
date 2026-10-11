import { Badge, Button, Card, ConfirmDialog, EmptyState } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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
    version: number;
    archived: boolean;
    subscriptions_count: number;
    prices: { currency: string; interval: string; price: number }[];
}

interface Option {
    value: string;
    label: string;
}

const format = (value: number | null | undefined) => (value === null || value === undefined ? '∞' : String(value));

export default function PlatformPlans({
    plans,
    currencies,
    enabled_currencies,
}: {
    plans: PlanRow[];
    currencies: Option[];
    enabled_currencies: string[];
}) {
    const [pending, setPending] = useState<{ type: 'archive' | 'delete'; plan: PlanRow } | null>(null);

    const confirmPending = () => {
        if (!pending) return;
        const onFinish = () => setPending(null);
        if (pending.type === 'archive') {
            router.post(route('platform.plans.archive', pending.plan.id), {}, { preserveScroll: true, onFinish });
        } else {
            router.delete(route('platform.plans.destroy', pending.plan.id), { preserveScroll: true, onFinish });
        }
    };

    return (
        <PlatformLayout
            title="Plans"
            description="Subscription plans and their multi-currency pricing. Editing a plan bumps its version; existing subscriptions keep their captured terms."
            actions={<Button size="sm" onClick={() => router.get(route('platform.plans.create'))}>New plan</Button>}
        >
            {plans.length === 0 ? (
                <Card>
                    <EmptyState title="No plans yet" description="Create your first subscription plan to start selling." action={<Button size="sm" onClick={() => router.get(route('platform.plans.create'))}>New plan</Button>} />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => {
                        const extraPricesForPlan = plan.prices.filter((p) => p.currency !== plan.currency);
                        const priced = new Set(plan.prices.map((p) => p.currency));
                        priced.add(plan.currency);
                        const missing = enabled_currencies.filter((c) => !priced.has(c));

                        return (
                            <Card key={plan.id} className="flex flex-col">
                                <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-semibold text-gray-900">{plan.name}</h2>
                                        <p className="truncate text-xs text-gray-400">{plan.slug}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <Badge tone={plan.archived ? 'neutral' : plan.is_active ? 'success' : 'warning'}>{plan.archived ? 'Archived' : plan.is_active ? 'Active' : 'Inactive'}</Badge>
                                        <span className="text-[11px] text-gray-400">v{plan.version} · {plan.subscriptions_count} tenants</span>
                                    </div>
                                </div>

                                <div className="px-5 py-4">
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-semibold tracking-tight text-gray-900">{plan.currency} {plan.price_monthly.toFixed(2)}</span>
                                        <span className="pb-1 text-sm text-gray-400">/ month</span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-gray-500">or {plan.currency} {plan.price_yearly.toFixed(2)} / year</p>

                                    {extraPricesForPlan.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {extraPricesForPlan.map((price) => (
                                                <span key={price.currency + price.interval} className="rounded-md bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-inset ring-gray-200">
                                                    {price.currency} {price.price.toFixed(2)}/{price.interval === 'yearly' ? 'yr' : 'mo'}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-center">
                                        {[
                                            ['Branches', format(plan.limits.branches)],
                                            ['Users', format(plan.limits.users)],
                                            ['Orders/mo', format(plan.limits.orders_this_month)],
                                        ].map(([label, value]) => (
                                            <div key={label}>
                                                <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
                                                <dd className="mt-0.5 text-sm font-semibold text-gray-800">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    {plan.features.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-1">
                                            {plan.features.map((feature) => (
                                                <span key={feature} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{feature}</span>
                                            ))}
                                        </div>
                                    )}

                                    <p className="mt-3 text-xs text-gray-400">{plan.trial_days}-day trial{plan.visibility === 'hidden' ? ' · hidden' : ''}</p>
                                    {missing.length > 0 && (
                                        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                            No price for {missing.join(', ')} — tenants on those currencies are billed in {plan.currency}.
                                        </p>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
                                    <Button size="sm" variant="secondary" onClick={() => router.get(route('platform.plans.edit', plan.id))}>Edit</Button>
                                    {!plan.archived && (
                                        <Button size="sm" variant="ghost" onClick={() => setPending({ type: 'archive', plan })}>Archive</Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:bg-red-50" onClick={() => setPending({ type: 'delete', plan })}>Delete</Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                show={pending?.type === 'archive'}
                title={`Archive ${pending?.plan.name}?`}
                description="Archived plans can no longer be assigned to subscriptions. Existing subscriptions keep their terms."
                confirmLabel="Archive plan"
                tone="primary"
                onConfirm={confirmPending}
                onClose={() => setPending(null)}
            />
            <ConfirmDialog
                show={pending?.type === 'delete'}
                title={`Delete ${pending?.plan.name}?`}
                description="A plan with subscriptions cannot be deleted — archive it instead. This action is blocked by a safety guard."
                confirmLabel="Delete plan"
                onConfirm={confirmPending}
                onClose={() => setPending(null)}
            />
        </PlatformLayout>
    );
}
