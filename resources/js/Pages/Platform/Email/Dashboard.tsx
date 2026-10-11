import { Badge, Button, Card, CardBody, CardHeader, KpiCard, formatDate } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link } from '@inertiajs/react';

interface LogRow {
    id: number;
    to: string;
    subject: string | null;
    status: string;
    mailer: string | null;
    error: string | null;
    created_at: string | null;
}

const TONE: Record<string, BadgeTone> = { sent: 'success', failed: 'danger', queued: 'warning' };

export default function EmailDashboard({
    stats,
    recent,
    provider,
}: {
    stats: { total: number; sent: number; failed: number; retryable: number; last_24h: number };
    recent: LogRow[];
    provider: { mailer: string | null; from_address: string | null; configured: boolean; host: string | null };
}) {
    return (
        <PlatformLayout title="Email Dashboard">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <KpiCard label="Total" value={stats.total} hint="All recorded email" />
                <KpiCard label="Sent" value={stats.sent} tone="success" hint="Accepted by the mailer" />
                <KpiCard label="Failed" value={stats.failed} tone={stats.failed > 0 ? 'danger' : 'neutral'} hint="Delivery errors" />
                <KpiCard label="Retryable" value={stats.retryable} tone="warning" hint="Can be re-sent automatically" />
                <KpiCard label="Last 24h" value={stats.last_24h} hint="Recent volume" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Recent email"
                        action={
                            <Link href={route('platform.email.logs')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                View all
                            </Link>
                        }
                    />
                    <CardBody className="space-y-2">
                        {recent.map((log) => (
                            <div key={log.id} className="flex items-center justify-between gap-3 text-sm">
                                <div className="min-w-0">
                                    <div className="truncate text-gray-700">{log.subject ?? '(no subject)'}</div>
                                    <div className="truncate text-xs text-gray-400">{log.to}</div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Badge tone={TONE[log.status] ?? 'neutral'}>{log.status}</Badge>
                                    <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                                </div>
                            </div>
                        ))}
                        {recent.length === 0 && <p className="text-sm text-gray-500">No email recorded yet.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Provider" action={<Button size="sm" variant="secondary" href={route('platform.email.settings')}>Configure</Button>} />
                    <CardBody>
                        <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Mailer</dt><dd className="text-gray-800">{provider.mailer ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Host</dt><dd className="text-gray-800">{provider.host ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">From</dt><dd className="truncate text-gray-800">{provider.from_address ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Configured in UI</dt><dd><Badge tone={provider.configured ? 'success' : 'neutral'}>{provider.configured ? 'Yes' : 'Using env'}</Badge></dd></div>
                        </dl>
                    </CardBody>
                </Card>
            </div>

            <p className="mt-4 text-xs text-gray-400">
                Statuses reflect what the configured mailer accepted. Delivered/bounced events require provider webhooks, which are not integrated yet.
            </p>
        </PlatformLayout>
    );
}
