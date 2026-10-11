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

    const money = (n: number) =>
        `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const apply = (params: Record<string, unknown>) =>
        router.get(
            route('reports.index'),
            { type, from, to, branch_id: filters.branch_id, ...params },
            { preserveScroll: true, replace: true },
        );

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
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Reports</h2>}
        >
            <Head title={title} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-white p-2 shadow-sm">
                        {types.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => apply({ type: t.value })}
                                className={
                                    'rounded-md px-3 py-1.5 text-sm ' +
                                    (type === t.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100')
                                }
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
                        <div>
                            <label className="text-xs text-gray-500">From</label>
                            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block rounded-md border-gray-300 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">To</label>
                            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block rounded-md border-gray-300 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Branch</label>
                            <select
                                value={filters.branch_id ?? ''}
                                onChange={(e) => apply({ branch_id: e.target.value || null })}
                                className="block rounded-md border-gray-300 text-sm"
                            >
                                <option value="">All branches</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button onClick={() => apply({})} className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900">
                            Apply
                        </button>
                        <span className="text-xs text-gray-400">Timezone: {timezone}</span>
                    </div>

                    {report.summary.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {report.summary.map((item, i) => (
                                <div key={i} className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="text-xs text-gray-500">{item.label}</div>
                                    <div className="mt-1 text-lg font-semibold text-gray-900">
                                        {format(item.value, item.format)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {report.chart && report.chart.length > 0 && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
                            <div className="space-y-2">
                                {report.chart.map((bar, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="w-40 truncate text-gray-600">{bar.label}</span>
                                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-indigo-500"
                                                style={{ width: `${(bar.value / maxChart) * 100}%` }}
                                            />
                                        </div>
                                        <span className="w-28 text-right text-gray-700">{money(bar.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.columns.length > 0 && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        {report.columns.map((c) => (
                                            <th key={c.key} className={c.align === 'right' ? 'py-2 text-right' : 'py-2'}>
                                                {c.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {report.rows.map((row, i) => (
                                        <tr key={i}>
                                            {report.columns.map((c) => (
                                                <td
                                                    key={c.key}
                                                    className={
                                                        'py-2 ' +
                                                        (c.align === 'right' ? 'text-right text-gray-700' : 'text-gray-800')
                                                    }
                                                >
                                                    {format(row[c.key], c.format)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {report.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={report.columns.length} className="py-8 text-center text-gray-500">
                                                No data for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
