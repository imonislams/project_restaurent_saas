import { Badge, Button, Card, CardBody, CardHeader, StatusDot, Textarea, Input } from '@/Components/ui';
import type { StatusTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Wrench } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

interface Indicator {
    key: string;
    label: string;
    status: 'ok' | 'warn' | 'error' | 'unavailable';
    detail: string;
    checked_at: string | null;
}

const TONE: Record<Indicator['status'], StatusTone> = { ok: 'ok', warn: 'warn', error: 'error', unavailable: 'idle' };
const LABEL: Record<Indicator['status'], string> = { ok: 'Healthy', warn: 'Attention', error: 'Failed', unavailable: 'Not monitored' };

export default function OpsHealth({
    indicators,
    summary,
    maintenance,
}: {
    indicators: Indicator[];
    summary: { state: string; counts: Record<string, number> };
    maintenance: { enabled: boolean; message: string; ends_at: string | null };
}) {
    const form = useForm({
        enabled: maintenance.enabled,
        message: maintenance.message,
        ends_at: maintenance.ends_at ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('platform.maintenance.update'), { preserveScroll: true });
    };

    return (
        <PlatformLayout
            title="System Operations & Health"
            description="Live health checks across queues, database, storage, redis cache, scheduler, and background services."
            actions={
                <div className="flex items-center gap-2">
                    <Badge tone={summary.state === 'error' ? 'danger' : summary.state === 'warn' ? 'warning' : 'success'}>
                        System {summary.state}
                    </Badge>
                </div>
            }
        >
            <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Summary:</span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {summary.counts.ok ?? 0} healthy
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {summary.counts.warn ?? 0} attention
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {summary.counts.error ?? 0} failed
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    {summary.counts.unavailable ?? 0} unmonitored
                </span>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Health Monitors"
                        description="Real-time telemetry from application layers"
                    />
                    <CardBody className="divide-y divide-border/60 p-0">
                        {indicators.map((indicator) => (
                            <div key={indicator.key} className="flex items-start justify-between gap-4 p-4 text-xs">
                                <div className="min-w-0 space-y-0.5">
                                    <div className="font-semibold text-foreground text-sm">{indicator.label}</div>
                                    <div className="text-muted-foreground leading-relaxed">{indicator.detail}</div>
                                    {indicator.checked_at && (
                                        <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1 pt-0.5">
                                            <Clock className="h-3 w-3" />
                                            Checked {new Date(indicator.checked_at).toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                                <div className="shrink-0 pt-0.5">
                                    {indicator.status === 'unavailable' ? (
                                        <Badge tone="neutral" dot={false}>
                                            {LABEL.unavailable}
                                        </Badge>
                                    ) : (
                                        <StatusDot tone={TONE[indicator.status]} label={LABEL[indicator.status]} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="Maintenance Mode"
                        description="Temporarily pause tenant operations while keeping platform administration accessible"
                    />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-4">
                            <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.data.enabled}
                                    onChange={(e) => form.setData('enabled', e.target.checked)}
                                    className="h-4 w-4 rounded border-input text-primary shadow-xs focus:ring-ring"
                                />
                                Enable Maintenance Mode
                            </label>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-foreground tracking-tight">
                                    Notice Message
                                </label>
                                <Textarea
                                    value={form.data.message}
                                    onChange={(e) => form.setData('message', e.target.value)}
                                    rows={3}
                                    placeholder="We are currently upgrading server systems..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-foreground tracking-tight">
                                    Scheduled Auto-Expire (Optional)
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={form.data.ends_at}
                                    onChange={(e) => form.setData('ends_at', e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <Button type="submit" size="sm" loading={form.processing} className="w-full">
                                Update Maintenance Settings
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
