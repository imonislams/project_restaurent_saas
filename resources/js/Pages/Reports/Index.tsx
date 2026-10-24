import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
} from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BranchSummary } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

const REPORT_GROUPS: { group: string; icon: string; types: string[] }[] = [
    {
        group: 'Sales & Revenue',
        icon: '💳',
        types: ['sales', 'hourly', 'payments', 'tax'],
    },
    {
        group: 'Menu & Products',
        icon: '🍔',
        types: ['products', 'categories'],
    },
    {
        group: 'Financials & P&L',
        icon: '📊',
        types: ['profit', 'expenses', 'cash'],
    },
    {
        group: 'Inventory & Waste',
        icon: '📦',
        types: ['inventory', 'purchases', 'waste'],
    },
    {
        group: 'Customers & Loyalty',
        icon: '🧑',
        types: ['customers', 'loyalty'],
    },
    {
        group: 'Team & Branches',
        icon: '👥',
        types: ['staff', 'branches'],
    },
];

export default function ReportsIndex({
    types,
    type,
    title,
    filters,
    branches,
    canViewAllBranches,
    timezone,
    currency,
    report,
}: {
    types: { value: string; label: string }[];
    type: string;
    title: string;
    filters: { from: string; to: string; branch_id: number | null };
    branches: BranchSummary[];
    canViewAllBranches: boolean;
    timezone: string;
    currency: string;
    report: Report;
}) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [branchId, setBranchId] = useState<string>(filters.branch_id ? String(filters.branch_id) : 'all');
    const [searchQuery, setSearchQuery] = useState('');

    const money = (n: number) =>
        `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const apply = (overrides: Record<string, unknown> = {}) => {
        router.get(
            route('reports.index'),
            {
                type,
                from,
                to,
                branch_id: branchId && branchId !== 'all' ? Number(branchId) : 'all',
                ...overrides,
            },
            { preserveScroll: true, replace: true }
        );
    };

    // Quick Date Range Presets
    const setPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'last_month') => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().slice(0, 10);

        let newFrom = '';
        let newTo = formatDate(today);

        if (preset === 'today') {
            newFrom = formatDate(today);
            newTo = formatDate(today);
        } else if (preset === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            newFrom = formatDate(y);
            newTo = formatDate(y);
        } else if (preset === 'week') {
            const w = new Date();
            w.setDate(w.getDate() - 7);
            newFrom = formatDate(w);
            newTo = formatDate(today);
        } else if (preset === 'month') {
            const m = new Date(today.getFullYear(), today.getMonth(), 1);
            newFrom = formatDate(m);
            newTo = formatDate(today);
        } else if (preset === 'last_month') {
            const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            newFrom = formatDate(first);
            newTo = formatDate(last);
        }

        setFrom(newFrom);
        setTo(newTo);
        apply({ from: newFrom, to: newTo });
    };

    const formatValue = (value: unknown, fmt?: string) => {
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

    // Filter table rows by search query
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return report.rows;
        const q = searchQuery.toLowerCase();
        return report.rows.filter((row) =>
            Object.values(row).some((val) => String(val).toLowerCase().includes(q))
        );
    }, [report.rows, searchQuery]);

    const maxChart = Math.max(1, ...(report.chart ?? []).map((c) => c.value));
    const totalChartSum = (report.chart ?? []).reduce((sum, c) => sum + c.value, 0);

    // Export CSV
    const exportCSV = () => {
        if (report.rows.length === 0 || report.columns.length === 0) return;

        const headers = report.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
        const rows = filteredRows.map((row) =>
            report.columns
                .map((c) => {
                    const val = row[c.key];
                    return `"${String(val ?? '').replace(/"/g, '""')}"`;
                })
                .join(',')
        );

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${type}-report-${from}-to-${to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Analytics & Business Intelligence"
                    description={`Reporting Suite · Currency: ${currency} · Timezone: ${timezone}`}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => window.print()}
                            >
                                🖨️ Print
                            </Button>
                            {report.rows.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={exportCSV}
                                >
                                    📥 Export CSV
                                </Button>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title={`${title} - Analytics & Reports`} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* REPORT SELECTOR GROUP PILLS */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                            {REPORT_GROUPS.map((group) => {
                                const isGroupActive = group.types.includes(type);

                                return (
                                    <div
                                        key={group.group}
                                        className={`rounded-xl border p-2.5 transition ${
                                            isGroupActive
                                                ? 'border-primary/25 bg-primary/5 shadow-xs'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-gray-700">
                                            <span>{group.icon}</span>
                                            <span>{group.group}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {group.types.map((reportKey) => {
                                                const reportTypeObj = types.find((t) => t.value === reportKey);
                                                if (!reportTypeObj) return null;
                                                const isActive = type === reportKey;

                                                return (
                                                    <button
                                                        key={reportKey}
                                                        type="button"
                                                        onClick={() => apply({ type: reportKey })}
                                                        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                                                            isActive
                                                                ? 'bg-primary text-white shadow-xs font-semibold'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {reportTypeObj.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* FILTER & DATE CONTROLS BAR */}
                    <Card>
                        <CardBody className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* Date Range Presets */}
                                <div className="flex flex-wrap items-center gap-1 text-xs">
                                    <span className="font-semibold text-gray-500 mr-1">Range:</span>
                                    <button
                                        type="button"
                                        onClick={() => setPreset('today')}
                                        className="rounded-md bg-gray-100 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-200 transition"
                                    >
                                        Today
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreset('yesterday')}
                                        className="rounded-md bg-gray-100 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-200 transition"
                                    >
                                        Yesterday
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreset('week')}
                                        className="rounded-md bg-gray-100 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-200 transition"
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreset('month')}
                                        className="rounded-md bg-gray-100 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-200 transition"
                                    >
                                        This Month (MTD)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreset('last_month')}
                                        className="rounded-md bg-gray-100 px-2.5 py-1.5 font-medium text-gray-700 hover:bg-gray-200 transition"
                                    >
                                        Last Month
                                    </button>
                                </div>

                                {/* Custom Date Inputs & Branch Selector */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={from}
                                            onChange={(e) => setFrom(e.target.value)}
                                            className="h-8 rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        />
                                        <span className="text-gray-400 text-xs">to</span>
                                        <input
                                            type="date"
                                            value={to}
                                            onChange={(e) => setTo(e.target.value)}
                                            className="h-8 rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-primary focus:ring-primary"
                                        />
                                    </div>

                                    <select
                                        value={branchId}
                                        onChange={(e) => {
                                            setBranchId(e.target.value);
                                            apply({ branch_id: e.target.value && e.target.value !== 'all' ? Number(e.target.value) : 'all' });
                                        }}
                                        className="h-8 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    >
                                        {canViewAllBranches && <option value="all">All Branches</option>}
                                        {branches.map((b) => (
                                            <option key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>

                                    <Button
                                        size="xs"
                                        variant="primary"
                                        onClick={() => apply()}
                                    >
                                        Refresh Data
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* KPI FINANCIAL SUMMARY METRICS */}
                    {report.summary.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {report.summary.map((item, i) => {
                                const isPositive =
                                    item.format === 'money' && typeof item.value === 'number' && item.value > 0;
                                const isNegative =
                                    item.format === 'money' && typeof item.value === 'number' && item.value < 0;

                                return (
                                    <KpiCard
                                        key={i}
                                        label={item.label}
                                        value={formatValue(item.value, item.format)}
                                        tone={isNegative ? 'danger' : isPositive ? 'success' : 'neutral'}
                                        hint={`Period: ${from} to ${to}`}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* VISUAL CHART BREAKDOWN */}
                    {report.chart && report.chart.length > 0 && (
                        <Card>
                            <CardHeader
                                title={`${title} Breakdown`}
                                description={`Relative distribution across categories/channels · Total: ${money(totalChartSum)}`}
                            />
                            <CardBody className="space-y-3">
                                {report.chart.map((bar, i) => {
                                    const percentage = totalChartSum > 0 ? (bar.value / totalChartSum) * 100 : 0;

                                    return (
                                        <div key={i} className="space-y-1 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-gray-800">{bar.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 font-mono">
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                    <span className="font-mono font-bold tabular-nums text-gray-900">
                                                        {money(bar.value)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-3.5 w-full overflow-hidden rounded-full bg-gray-100 p-0.5">
                                                <div
                                                    className="h-full rounded-full bg-linear-to-r from-primary to-primary transition-all duration-500"
                                                    style={{ width: `${Math.min(100, Math.max(3, (bar.value / maxChart) * 100))}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardBody>
                        </Card>
                    )}

                    {/* HIGH-DENSITY REPORT DATA TABLE */}
                    {report.columns.length > 0 && (
                        <Card>
                            <CardHeader
                                title={title}
                                description={`${filteredRows.length} of ${report.rows.length} total rows`}
                                action={
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search table rows…"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-8 w-44 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-60"
                                        />
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <tr>
                                                {report.columns.map((c) => (
                                                    <th
                                                        key={c.key}
                                                        className={
                                                            c.align === 'right'
                                                                ? 'px-6 py-3.5 text-right'
                                                                : 'px-6 py-3.5'
                                                        }
                                                    >
                                                        {c.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredRows.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                                                    {report.columns.map((c) => (
                                                        <td
                                                            key={c.key}
                                                            className={`px-6 py-3.5 ${
                                                                c.align === 'right'
                                                                    ? 'text-right font-mono font-medium tabular-nums text-gray-900'
                                                                    : 'font-medium text-gray-800'
                                                            }`}
                                                        >
                                                            {formatValue(row[c.key], c.format)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredRows.length === 0 && (
                                    <EmptyState
                                        title="No Data for This Report Period"
                                        description="No records matched the selected date range and branch criteria. Adjust dates or change filters."
                                    />
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
