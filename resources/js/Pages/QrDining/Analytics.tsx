import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card, { CardBody, CardHeader } from '@/Components/ui/Card';
import { SelectField, TextField } from '@/Components/ui/Field';
import KpiCard from '@/Components/ui/KpiCard';
import PageHeader from '@/Components/ui/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface SummaryItem {
    label: string;
    value: number;
    format: 'money' | 'number';
}

interface TopItem {
    name: string;
    quantity: number;
    revenue: number;
}

interface Analytics {
    summary: SummaryItem[];
    top_items: TopItem[];
    currency: string;
    from: string;
    to: string;
    branch_id: number | null;
}

export default function QrAnalytics({
    analytics,
    branches,
}: {
    analytics: Analytics;
    branches: { id: number; name: string }[];
}) {
    const [from, setFrom] = useState(analytics.from);
    const [to, setTo] = useState(analytics.to);
    const [branchId, setBranchId] = useState(String(analytics.branch_id ?? ''));

    const money = (n: number) => `${analytics.currency} ${Number(n || 0).toFixed(2)}`;

    const apply = () => {
        router.get(
            route('qr-dining.analytics'),
            { from, to, branch_id: branchId || null },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="QR Dining Analytics"
                    description="How guests use app-less ordering — sessions, orders, revenue and popular items."
                />
            }
        >
            <Head title="QR Dining Analytics" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardBody>
                            <div className="flex flex-wrap items-end gap-3">
                                <TextField label="From" type="date" value={from} onChange={setFrom} className="w-44" />
                                <TextField label="To" type="date" value={to} onChange={setTo} className="w-44" />
                                <SelectField
                                    label="Branch"
                                    value={branchId}
                                    options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                                    onChange={setBranchId}
                                    className="w-48"
                                />
                                <Button onClick={apply}>Apply</Button>
                            </div>
                        </CardBody>
                    </Card>

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {analytics.summary.map((item) => (
                            <KpiCard
                                key={item.label}
                                label={item.label}
                                value={item.format === 'money' ? money(item.value) : item.value}
                            />
                        ))}
                    </div>

                    <Card>
                        <CardHeader title="Popular QR items" description="Ranked by quantity ordered." />
                        <CardBody className="p-0">
                            {analytics.top_items.length === 0 ? (
                                <p className="px-5 py-10 text-center text-sm text-gray-400">
                                    No QR orders in this period yet.
                                </p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">Item</th>
                                            <th className="px-5 py-3 text-right">Quantity</th>
                                            <th className="px-5 py-3 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {analytics.top_items.map((item) => (
                                            <tr key={item.name} className="hover:bg-gray-50">
                                                <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                                                <td className="px-5 py-3 text-right tabular-nums">{item.quantity}</td>
                                                <td className="px-5 py-3 text-right font-mono text-xs">{money(item.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardBody>
                    </Card>

                    <p className="text-center text-xs text-gray-400">
                        Revenue counts settled QR orders only. Cancelled and rejected orders are excluded.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
