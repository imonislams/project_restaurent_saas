import { Badge, Button, Card, ConfirmDialog, EmptyState } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Sparkles, Trash2, Archive, Check } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

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
            title="Subscription Plans"
            description="Configure subscription tiers, limits, multi-currency pricing, and feature entitlements."
            actions={
                <Button
                    size="sm"
                    onClick={() => router.get(route('platform.plans.create'))}
                    icon={<Plus className="h-4 w-4" />}
                >
                    Create Plan
                </Button>
            }
        >
            {plans.length === 0 ? (
                <Card>
                    <EmptyState
                        title="No plans yet"
                        description="Create your first subscription plan to start selling."
                        action={
                            <Button size="sm" onClick={() => router.get(route('platform.plans.create'))}>
                                Create Plan
                            </Button>
                        }
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => {
                        const extraPricesForPlan = plan.prices.filter((p) => p.currency !== plan.currency);
                        const priced = new Set(plan.prices.map((p) => p.currency));
                        priced.add(plan.currency);
                        const missing = enabled_currencies.filter((c) => !priced.has(c));

                        return (
                            <Card key={plan.id} className="flex h-full flex-col">
                                <div className="flex min-h-[4.5rem] items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                                            {plan.name}
                                        </h2>
                                        <p className="truncate font-mono text-[11px] text-muted-foreground">{plan.slug}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <Badge tone={plan.archived ? 'neutral' : plan.is_active ? 'success' : 'warning'}>
                                            {plan.archived ? 'Archived' : plan.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            v{plan.version} · {plan.subscriptions_count} tenant(s)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col px-5 py-4">
                                    <div className="min-h-[5.25rem]">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                                                {plan.currency} {plan.price_monthly.toFixed(2)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">/ month</span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            or {plan.currency} {plan.price_yearly.toFixed(2)} / year
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {plan.trial_days}-day trial{plan.visibility === 'hidden' ? ' · Hidden from checkout' : ''}
                                        </p>
                                    </div>

                                    <dl className="grid grid-cols-3 gap-2 rounded-md border border-border/80 bg-muted/20 p-2.5 text-center">
                                        {[
                                            ['Branches', format(plan.limits.branches)],
                                            ['Users', format(plan.limits.users)],
                                            ['Orders/mo', format(plan.limits.orders_this_month)],
                                        ].map(([label, value]) => (
                                            <div key={label}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                                                <dd className="mt-0.5 text-sm font-bold text-foreground tabular-nums">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
                                        {plan.features.map((feature) => (
                                            <span
                                                key={feature}
                                                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground/80"
                                            >
                                                <Check className="h-3 w-3 stroke-[2.5] text-primary" />
                                                <span>{feature}</span>
                                            </span>
                                        ))}
                                    </div>

                                    {(extraPricesForPlan.length > 0 || missing.length > 0) && (
                                        <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                                            {extraPricesForPlan.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {extraPricesForPlan.map((price) => (
                                                        <span
                                                            key={price.currency + price.interval}
                                                            className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                        >
                                                            {price.currency} {price.price.toFixed(2)}/{price.interval === 'yearly' ? 'yr' : 'mo'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {missing.length > 0 && (
                                                <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700">
                                                    No price for {missing.join(', ')} — billed in {plan.currency}.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => router.get(route('platform.plans.edit', plan.id))}
                                    >
                                        Edit Plan
                                    </Button>
                                    {!plan.archived && (
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => setPending({ type: 'archive', plan })}
                                        >
                                            Archive
                                        </Button>
                                    )}
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        className="ml-auto text-destructive hover:bg-destructive/10"
                                        onClick={() => setPending({ type: 'delete', plan })}
                                    >
                                        Delete
                                    </Button>
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
