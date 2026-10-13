import { Badge, Button, Card, CardBody, CardHeader, KpiCard, PageHeader, StatusDot } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ChevronRight,
    Layers,
    ShieldCheck,
    ShoppingCart,
    Store,
    UserPlus,
    Users,
    UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/Components/ui/cn';

interface ChecklistItem {
    key: string;
    label: string;
    done: boolean;
    required: boolean;
    action: { label: string; href: string } | null;
}

interface TenantInfo {
    name: string;
    slug: string;
    status: string;
    on_trial: boolean;
    trial_ends_at: string | null;
    onboarding_completed: boolean;
    currency: string | null;
    timezone: string | null;
    plan: string | null;
    subscription_status: string | null;
}

interface Progress {
    percent: number;
    completed: number;
    total: number;
    steps: { value: string; label: string; complete: boolean; required: boolean }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { active: 'success', suspended: 'danger', pending: 'warning', archived: 'neutral' };

export default function Dashboard({
    tenant,
    checklist,
    warnings,
    progress,
    stats,
}: {
    tenant: TenantInfo | null;
    checklist: ChecklistItem[];
    warnings: { key: string; label: string }[];
    progress: Progress | null;
    stats: { branches?: number; users?: number };
}) {
    const { flash } = usePage().props as Record<string, any>;
    const t = useT();

    if (tenant === null) {
        return (
            <AuthenticatedLayout header={<PageHeader title={t('nav.overview')} />}>
                <Head title="Dashboard" />
                <div className="py-12">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Card>
                            <CardBody className="py-10 text-center">
                                <p className="text-sm text-muted-foreground">This account is not linked to an active restaurant workspace.</p>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    const remaining = checklist.filter((item) => !item.done);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title={tenant.name}
                    description={`${tenant.timezone ?? 'UTC'} · Default Currency: ${tenant.currency ?? 'USD'}`}
                    actions={
                        <div className="flex items-center gap-2">
                            {tenant.on_trial && <Badge tone="warning">Active Trial</Badge>}
                            <Badge tone={STATUS_TONE[tenant.status] ?? 'neutral'}>
                                {tenant.status}
                            </Badge>
                            {!tenant.onboarding_completed && (
                                <Button size="sm" href={route('onboarding.index')}>
                                    {t('dash.continue_setup')}
                                </Button>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs">
                            <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
                            <span>{flash.success}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <KpiCard
                            label={t('dash.branches')}
                            value={stats.branches ?? 0}
                            icon={<Store className="h-4 w-4" />}
                        />
                        <KpiCard
                            label={t('dash.users')}
                            value={stats.users ?? 0}
                            icon={<Users className="h-4 w-4" />}
                        />
                        <KpiCard
                            label={t('dash.plan')}
                            value={tenant.plan ? <span className="font-mono text-xl">{tenant.plan}</span> : '—'}
                            hint={tenant.subscription_status ?? 'No subscription'}
                            icon={<Layers className="h-4 w-4" />}
                        />
                        <KpiCard
                            label={t('dash.status')}
                            value={<span className="capitalize">{tenant.status}</span>}
                            tone={tenant.status === 'active' ? 'success' : tenant.status === 'suspended' ? 'danger' : 'warning'}
                            icon={<ShieldCheck className="h-4 w-4" />}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader
                                title={t('dash.checklist')}
                                description={progress ? `${progress.completed} of ${progress.total} ${t('dash.complete')}` : undefined}
                            />
                            <CardBody className="p-5">
                                {progress && (
                                    <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress.percent}%` }}
                                        />
                                    </div>
                                )}

                                <ul className="divide-y divide-border/60">
                                    {checklist.map((item) => (
                                        <li key={item.key} className="flex items-center justify-between gap-3 py-3 text-xs">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span
                                                    className={cn(
                                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                                        item.done
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}
                                                >
                                                    {item.done ? <Check className="h-3 w-3 stroke-[3]" /> : '•'}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'truncate font-medium',
                                                        item.done ? 'text-muted-foreground line-through' : 'text-foreground'
                                                    )}
                                                >
                                                    {item.label}
                                                </span>
                                                {item.required && !item.done && <Badge tone="danger">{t('dash.required')}</Badge>}
                                            </div>
                                            {!item.done && item.action && (
                                                <Link
                                                    href={item.action.href}
                                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <span>{item.action.label}</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardBody>
                        </Card>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader title={t('dash.next_steps')} description={t('dash.next_steps_body')} />
                                <CardBody className="space-y-2 p-4">
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href={route('menu.index')}
                                            className="group flex items-center justify-between rounded-md border border-border/80 bg-background/50 hover:bg-accent/60 p-2.5 text-xs font-semibold text-foreground transition-all shadow-2xs hover:border-border"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    <UtensilsCrossed className="h-3.5 w-3.5" />
                                                </div>
                                                <span>{t('dash.go_menu')}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                        <Link
                                            href={route('pos.index')}
                                            className="group flex items-center justify-between rounded-md border border-border/80 bg-background/50 hover:bg-accent/60 p-2.5 text-xs font-semibold text-foreground transition-all shadow-2xs hover:border-border"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    <ShoppingCart className="h-3.5 w-3.5" />
                                                </div>
                                                <span>{t('dash.open_pos')}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                        <Link
                                            href={route('staff.index')}
                                            className="group flex items-center justify-between rounded-md border border-border/80 bg-background/50 hover:bg-accent/60 p-2.5 text-xs font-semibold text-foreground transition-all shadow-2xs hover:border-border"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    <UserPlus className="h-3.5 w-3.5" />
                                                </div>
                                                <span>{t('dash.invite_staff')}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                </CardBody>
                            </Card>

                            {remaining.length > 0 && !tenant.onboarding_completed && (
                                <Card className="border-amber-500/20 bg-amber-500/5">
                                    <CardHeader title={t('dash.finish_banner')} />
                                    <CardBody className="space-y-2 p-4 text-xs">
                                        <StatusDot tone="warn" label={`${remaining.filter((i) => i.required).length} required step(s) pending`} />
                                        <p className="text-muted-foreground">
                                            {warnings.map((w) => w.label).join(', ') || 'Complete remaining profile steps'}
                                        </p>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
