import { Badge, Button, Card, CardBody, CardHeader, StatusDot } from '@/Components/ui';
import type { StatusTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

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
        <PlatformLayout title="System Health">
            <div className="mb-4 flex items-center gap-3">
                <Badge tone={summary.state === 'error' ? 'danger' : summary.state === 'warn' ? 'warning' : 'success'}>System {summary.state}</Badge>
                <span className="text-xs text-gray-400">
                    {summary.counts.ok ?? 0} ok · {summary.counts.warn ?? 0} attention · {summary.counts.error ?? 0} failed · {summary.counts.unavailable ?? 0} not monitored
                </span>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Indicators" />
                    <CardBody className="space-y-3">
                        {indicators.map((indicator) => (
                            <div key={indicator.key} className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-800">{indicator.label}</div>
                                    <div className="truncate text-xs text-gray-500">{indicator.detail}</div>
                                </div>
                                <div className="shrink-0">
                                    {indicator.status === 'unavailable' ? <Badge tone="neutral">{LABEL.unavailable}</Badge> : <StatusDot tone={TONE[indicator.status]} label={LABEL[indicator.status]} />}
                                </div>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Maintenance mode" description="Blocks tenant traffic; platform, payments and health keep running" />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={form.data.enabled} onChange={(e) => form.setData('enabled', e.target.checked)} className="rounded border-gray-300" />
                                Enable maintenance mode
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Message</span>
                                <textarea value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} rows={3} className="block w-full rounded-md border-gray-300 text-sm" />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Auto-expire at (optional)</span>
                                <input type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm" />
                            </label>
                            <Button type="submit" size="sm" loading={form.processing}>
                                Save
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
