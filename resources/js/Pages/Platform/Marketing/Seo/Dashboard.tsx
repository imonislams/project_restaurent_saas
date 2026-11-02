import { Alert, Badge, Card, CardBody, CardHeader, DataTable, EmptyState } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';

interface Finding {
    severity: string;
    code: string;
    message: string;
    path: string | null;
}

interface Audit {
    findings: Finding[];
    checked: number;
    summary: { errors: number; warnings: number; info: number };
    generated_at: string;
}

export default function SeoDashboard({
    audit,
    sitemap,
    robots,
    redirects,
    tracking,
}: {
    audit: Audit;
    sitemap: { enabled: boolean; url: string; urls: number; last_generated_at: string | null };
    robots: { enabled: boolean; custom: boolean; url: string };
    redirects: { total: number; active: number; hits: number; top: Array<{ from: string; to: string; hits: number }> };
    tracking: { events: number; page_views: number };
}) {
    const columns: Column<Finding>[] = [
        {
            key: 'severity',
            label: 'Severity',
            render: (row) => (
                <Badge tone={row.severity === 'error' ? 'danger' : row.severity === 'warning' ? 'warning' : 'neutral'}>
                    {row.severity}
                </Badge>
            ),
        },
        { key: 'message', label: 'Finding', render: (row) => <span className="text-sm">{row.message}</span> },
        {
            key: 'path',
            label: 'Page',
            render: (row) =>
                row.path ? <code className="font-mono text-[11px] text-muted-foreground">{row.path}</code> : '—',
        },
    ];

    return (
        <PlatformLayout
            title="SEO dashboard"
            description="Technical health of the public site, generated from the metadata this platform actually serves."
        >
            <Head title="SEO dashboard" />

            <Alert
                variant={audit.summary.errors > 0 ? 'warning' : 'success'}
                title={
                    audit.summary.errors > 0
                        ? `${audit.summary.errors} error(s) and ${audit.summary.warnings} warning(s) across ${audit.checked} pages`
                        : `No errors across ${audit.checked} pages`
                }
            >
                <p>
                    This inspects the metadata generation produces for each public route — not a crawled HTML snapshot,
                    so it runs instantly and cannot disagree with what a crawler is served. Generated{' '}
                    {formatDateTime(audit.generated_at)}.
                </p>
            </Alert>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    ['Sitemap', sitemap.enabled ? `${sitemap.urls} URLs` : 'Off — static file', sitemap.url],
                    ['robots.txt', robots.enabled ? (robots.custom ? 'Custom' : 'Generated') : 'Off — static file', robots.url],
                    ['Redirects', `${redirects.active} active / ${redirects.total}`, `${formatNumber(redirects.hits)} hits`],
                    ['Tracking', `${formatNumber(tracking.page_views)} page views`, `${formatNumber(tracking.events)} events`],
                ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={hint}>
                            {hint}
                        </p>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader
                    title="Technical findings"
                    description="Errors first. Each one names the page it affects."
                    action={
                        <div className="flex gap-2 text-xs">
                            <Link href={route('platform.marketing.seo.pages')} className="font-semibold text-primary hover:underline">
                                Edit metadata
                            </Link>
                            <Link href={route('platform.marketing.seo.sitemap')} className="font-semibold text-primary hover:underline">
                                Sitemap
                            </Link>
                        </div>
                    }
                />
                <CardBody className="p-0">
                    <DataTable
                        columns={columns}
                        rows={audit.findings}
                        rowKey={(row) => `${row.code}-${row.path ?? 'global'}`}
                        empty={
                            <EmptyState
                                title="Nothing to fix"
                                description="Every audited page has a title, a description, an absolute canonical and an indexable robots directive."
                            />
                        }
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Most-used redirects" description="Where old URLs actually go." />
                <CardBody className="p-0">
                    <DataTable
                        columns={[
                            { key: 'from', label: 'From', render: (row) => <code className="font-mono text-[11px]">{row.from}</code> },
                            { key: 'to', label: 'To', render: (row) => <code className="font-mono text-[11px] text-muted-foreground">{row.to}</code> },
                            { key: 'hits', label: 'Hits', align: 'right', render: (row) => formatNumber(row.hits) },
                        ]}
                        rows={redirects.top}
                        rowKey={(row) => row.from}
                        empty={<EmptyState title="No redirects yet" description="Add them under SEO → Redirects." />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
