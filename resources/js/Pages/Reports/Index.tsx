import { Button, Card, CardBody, CardHeader, EmptyState, FilterBar, KpiCard, PageHeader, SelectField, Tabs, TextField } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface SummaryItem {
    label: string;
    value: number | string;
    format?: 'money' | 'number' | 'percent' | 'text';
}

interface Column {
    key: string;
    label: string;
    align?: 'left' | 'right';
    format?: 'money' | 'number' | 'datetime' | 'text';
}

interface Report {
    summary: SummaryItem[];
    columns: Column[];
    rows: Record<string, unknown>[];
    chart?: { label: string; value: number }[];
}

export default function ReportsIndex({
    types,
    type,
    title,
    filters,
    branches,
    timezone,
    currency,
    report,
}: {
    types: { value: string; label: string }[];
    type: string;
    title: string;
    filters: { from: string; to: string; branch_id: number | null };
    branches: { id: number; name: string }[];
    timezone: string;
    currency: string;
    report: Report;
}) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const money = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const apply = (params: Record<string, unknown>) =>
        router.get(route('reports.index'), { type, from, to, branch_id: filters.branch_id, ...params }, { preserveScroll: true, replace: true });

    const format = (value: unknown, fmt?: string) => {
        if (value === null || value === undefined || value === '') return '—';
        switch (fmt) {
            case 'money':
                return money(Number(value));
            case 'number':
                return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
            case 'percent':
                return `${Number(value).toFixed(1)}%`;
            case 'datetime':
                return new Date(String(value)).toLocaleString();
            default:
                return String(value);
        }
    };

    const maxChart = Math.max(1, ...(report.chart ?? []).map((c) => c.value));

    return (
        <AuthenticatedLayout
            header={<PageHeader title="Reports" description={`Figures in ${currency} · ${timezone}`} />}
        >
            <Head title={title} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    <Tabs tabs={types.map((t) => ({ key: t.value, label: t.label }))} value={type} onChange={(key) => apply({ type: key })} />

                    <FilterBar
                        actions={
                            <Button size="sm" onClick={() => apply({})}>
                                Apply
                            </Button>
                        }
                    >
                        <TextField label="From" type="date" value={from} onChange={setFrom} />
                        <TextField label="To" type="date" value={to} onChange={setTo} />
                        <SelectField
                            label="Branch"
                            value={filters.branch_id ? String(filters.branch_id) : ''}
                            options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                            onChange={(v) => apply({ branch_id: v || null })}
                        />
                    </FilterBar>

                    {report.summary.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {report.summary.map((item, i) => (
                                <KpiCard key={i} label={item.label} value={format(item.value, item.format)} />
                            ))}
                        </div>
                    )}

                    {report.chart && report.chart.length > 0 && (
                        <Card>
                            <CardHeader title={title} description="Breakdown" />
                            <CardBody className="space-y-2">
                                {report.chart.map((bar, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="w-40 truncate text-gray-600">{bar.label}</span>
                                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(bar.value / maxChart) * 100}%` }} />
                                        </div>
                                        <span className="w-28 text-right tabular-nums text-gray-700">{money(bar.value)}</span>
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                    )}

                    {report.columns.length > 0 && (
                        <Card>
                            <CardBody className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                {report.columns.map((c) => (
                                                    <th key={c.key} className={c.align === 'right' ? 'px-5 py-3 text-right' : 'px-5 py-3'}>
                                                        {c.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {report.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    {report.columns.map((c) => (
                                                        <td key={c.key} className={'px-5 py-3 ' + (c.align === 'right' ? 'text-right tabular-nums text-gray-700' : 'text-gray-800')}>
                                                            {format(row[c.key], c.format)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {report.rows.length === 0 && <EmptyState title="No data for this period" description="Adjust the date range or branch filter." />}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
