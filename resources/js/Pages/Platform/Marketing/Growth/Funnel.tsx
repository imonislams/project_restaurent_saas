import { Alert, Card, CardBody, CardHeader, DataTable, FilterBar } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatNumber } from '@/Components/ui/Money';
import PeriodFilter, { EXTENDED_PRESETS, PeriodValue } from '@/Components/ui/PeriodFilter';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';

interface Step {
    key: string;
    label: string;
    count: number;
    conversion_rate: number | null;
    drop_off: number | null;
    source: string;
}

export default function Funnel({
    period,
    funnel,
    methodology,
}: {
    period: { preset: string; from: string; to: string; label: string; timezone: string };
    funnel: { steps: Step[]; overall_rate: number; generated_at: string };
    methodology: string[];
}) {
    const apply = (next: PeriodValue) =>
        router.get(
            route('platform.marketing.growth.funnel'),
            next.preset === 'custom' ? { preset: 'custom', from: next.from, to: next.to } : { preset: next.preset },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const columns: Column<Step>[] = [
        { key: 'label', label: 'Step', render: (row) => <span className="text-sm font-medium text-foreground">{row.label}</span> },
        { key: 'count', label: 'Reached', align: 'right', render: (row) => <span className="font-mono text-sm">{formatNumber(row.count)}</span> },
        {
            key: 'conversion_rate',
            label: 'From previous',
            align: 'right',
            render: (row) => (row.conversion_rate === null ? <span className="text-xs text-muted-foreground">—</span> : `${row.conversion_rate}%`),
        },
        {
            key: 'drop_off',
            label: 'Drop-off',
            align: 'right',
            render: (row) => (row.drop_off === null ? <span className="text-xs text-muted-foreground">—</span> : <span className={row.drop_off > 70 ? 'text-rose-600' : ''}>{row.drop_off}%</span>),
        },
        { key: 'source', label: 'Source', render: (row) => <code className="font-mono text-[11px] text-muted-foreground">{row.source}</code> },
    ];

    return (
        <PlatformLayout
            title="Conversion funnel"
            description="Visitor to paid subscription, measured from records this platform holds."
        >
            <Head title="Conversion funnel" />

            <Alert variant="info" title="Counted once per person, not per event">
                Steps before registration count distinct visitors; steps from registration onward count distinct restaurants.
                Re-visiting the pricing page does not inflate the step. A zero here means no activity was recorded, not that the
                measurement is missing.
            </Alert>

            <FilterBar>
                <p className="text-xs text-muted-foreground">
                    {period.label} · {period.from} to {period.to} · overall conversion {funnel.overall_rate}%
                </p>
                <PeriodFilter
                    value={{ preset: period.preset as PeriodValue['preset'], from: period.from, to: period.to }}
                    onChange={apply}
                    presets={EXTENDED_PRESETS}
                />
            </FilterBar>

            <Card>
                <CardHeader title="Funnel steps" description="Each row is a step; the percentage is against the step above it." />
                <CardBody className="p-0">
                    <DataTable columns={columns} rows={funnel.steps} rowKey={(row) => row.key} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="How these are calculated" />
                <CardBody className="p-4">
                    <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                        {methodology.map((line) => (
                            <li key={line} className="flex gap-2">
                                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
