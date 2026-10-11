import { Badge, Card, CardBody, CardHeader, KpiCard, StatusDot } from '@/Components/ui';
import type { StatusTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

interface Indicator {
    key: string;
    label: string;
    status: 'ok' | 'warn' | 'error' | 'unavailable';
    detail: string;
    checked_at: string | null;
}

const TONE: Record<Indicator['status'], StatusTone> = { ok: 'ok', warn: 'warn', error: 'error', unavailable: 'idle' };
const LABEL: Record<Indicator['status'], string> = { ok: 'Healthy', warn: 'Attention', error: 'Failed', unavailable: 'Not monitored' };

function Rows({ data }: { data: Record<string, string | number | boolean | null> }) {
    return (
        <dl className="divide-y divide-gray-50 text-sm">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                    <dt className="capitalize text-gray-500">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-gray-800">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? '—')}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function Diagnostics({
    health,
    healthSummary,
    platform,
    drivers,
    integrations,
    queues,
    errors,
    storage,
}: {
    health: Indicator[];
    healthSummary: { state: string; counts: Record<string, number> };
    platform: Record<string, string | boolean>;
    drivers: Record<string, string | null>;
    integrations: Record<string, string | number | boolean | null>;
    queues: { queued: number; failed: number };
    errors: { last_24h: number; last_7d: number };
    storage: { disk_free: string; log_size: string };
}) {
    return (
        <PlatformLayout title="Diagnostics" description="Platform-wide runtime diagnostics. Values are read-only and contain no secrets.">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Health" value={healthSummary.state.toUpperCase()} tone={healthSummary.state === 'error' ? 'danger' : healthSummary.state === 'warn' ? 'warning' : 'success'} hint={`${healthSummary.counts.unavailable ?? 0} not monitored`} />
                <KpiCard label="Queued jobs" value={queues.queued} />
                <KpiCard label="Failed jobs" value={queues.failed} tone={queues.failed > 0 ? 'danger' : 'neutral'} />
                <KpiCard label="Errors (24h)" value={errors.last_24h} tone={errors.last_24h > 0 ? 'warning' : 'neutral'} hint={`${errors.last_7d} in 7 days`} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                    <CardHeader title="Runtime" />
                    <CardBody>
                        <Rows data={{ ...platform, 'disk free': storage.disk_free, 'log size': storage.log_size }} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title="Drivers" />
                    <CardBody>
                        <Rows data={drivers} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title="Integrations" />
                    <CardBody>
                        <Rows data={integrations} />
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-5">
                <CardHeader title="Service checks" description="Live probes run when this page loads" />
                <CardBody className="space-y-3">
                    {health.map((indicator) => (
                        <div key={indicator.key} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800">{indicator.label}</div>
                                <div className="truncate text-xs text-gray-500">{indicator.detail}</div>
                            </div>
                            {indicator.status === 'unavailable' ? <Badge tone="neutral">{LABEL.unavailable}</Badge> : <StatusDot tone={TONE[indicator.status]} label={LABEL[indicator.status]} />}
                        </div>
                    ))}
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
