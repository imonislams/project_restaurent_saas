import { Badge, Button, Card, CardBody, CardHeader, EmptyState, KpiCard, PageHeader, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ExpenseRow {
    id: number;
    description: string;
    amount: number;
    expense_date: string | null;
    category: string | null;
    branch: string | null;
    account: string | null;
    status: string;
    status_label: string;
    created_by: string | null;
    reference: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = { approved: 'success', submitted: 'warning', rejected: 'danger', draft: 'neutral' };

export default function ExpensesIndex({
    branches,
    categories,
    accounts,
    expenses,
    autoApproveLimit,
}: {
    branches: { id: number; name: string }[];
    categories: { id: number; name: string; type: string }[];
    accounts: { id: number; name: string; type: string }[];
    expenses: ExpenseRow[];
    autoApproveLimit: number | null;
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('expenses.manage');
    const canApprove = auth.permissions.includes('expenses.approve');

    const [showCategory, setShowCategory] = useState(false);

    const form = useForm<{
        branch_id: number | '';
        expense_category_id: number | '';
        financial_account_id: number | '';
        amount: number;
        expense_date: string;
        payment_method: string;
        reference: string;
        description: string;
        notes: string;
    }>({
        branch_id: branches[0]?.id ?? '',
        expense_category_id: categories[0]?.id ?? '',
        financial_account_id: accounts[0]?.id ?? '',
        amount: 0,
        expense_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
        reference: '',
        description: '',
        notes: '',
    });

    const catForm = useForm({ name: '', type: 'expense' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('expenses.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('amount', 'description', 'reference', 'notes'),
        });
    };

    const submitCategory: FormEventHandler = (e) => {
        e.preventDefault();
        catForm.post(route('expenses.categories.store'), {
            preserveScroll: true,
            onSuccess: () => {
                catForm.reset('name');
                setShowCategory(false);
            },
        });
    };

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pending = expenses.filter((e) => e.status === 'submitted').length;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Expenses"
                    description="Record spending and route anything above the threshold for approval."
                    actions={
                        canManage && (
                            <Button size="sm" variant="secondary" onClick={() => setShowCategory((v) => !v)}>
                                {showCategory ? 'Close' : 'Expense categories'}
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Expenses" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <KpiCard label="Total recorded" value={total.toFixed(2)} />
                        <KpiCard label="Entries" value={expenses.length} />
                        <KpiCard label="Awaiting approval" value={pending} tone={pending > 0 ? 'warning' : 'neutral'} />
                        <KpiCard label="Auto-approve limit" value={autoApproveLimit ?? 'Off'} hint={autoApproveLimit !== null ? 'above this needs approval' : undefined} />
                    </div>

                    {showCategory && canManage && (
                        <Card>
                            <CardHeader title="New category" />
                            <CardBody>
                                <form onSubmit={submitCategory} className="flex flex-wrap items-end gap-3">
                                    <TextField label="Category name" className="w-64" value={catForm.data.name} error={catForm.errors.name} onChange={(v) => catForm.setData('name', v)} />
                                    <SelectField
                                        label="Type"
                                        className="w-40"
                                        value={catForm.data.type}
                                        options={[
                                            { value: 'expense', label: 'Expense' },
                                            { value: 'income', label: 'Income' },
                                        ]}
                                        onChange={(v) => catForm.setData('type', v)}
                                    />
                                    <Button type="submit" loading={catForm.processing}>Add</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    {canManage && (
                        <Card>
                            <CardHeader title="Record expense" />
                            <CardBody>
                                <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <TextField label="Description" value={form.data.description} error={form.errors.description} onChange={(v) => form.setData('description', v)} />
                                    <TextField label="Amount" type="number" value={String(form.data.amount)} error={form.errors.amount} onChange={(v) => form.setData('amount', Number(v))} />
                                    <TextField label="Date" type="date" value={form.data.expense_date} error={form.errors.expense_date} onChange={(v) => form.setData('expense_date', v)} />
                                    <SelectField
                                        label="Category"
                                        value={form.data.expense_category_id === '' ? '' : String(form.data.expense_category_id)}
                                        options={[{ value: '', label: 'None' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
                                        onChange={(v) => form.setData('expense_category_id', v ? Number(v) : '')}
                                    />
                                    <SelectField
                                        label="Account"
                                        value={form.data.financial_account_id === '' ? '' : String(form.data.financial_account_id)}
                                        options={[{ value: '', label: 'None' }, ...accounts.map((a) => ({ value: String(a.id), label: a.name }))]}
                                        onChange={(v) => form.setData('financial_account_id', v ? Number(v) : '')}
                                    />
                                    <SelectField
                                        label="Branch"
                                        value={form.data.branch_id === '' ? '' : String(form.data.branch_id)}
                                        options={[{ value: '', label: 'Company-wide' }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                                        onChange={(v) => form.setData('branch_id', v ? Number(v) : '')}
                                    />
                                    <TextField label="Reference" value={form.data.reference} error={form.errors.reference} onChange={(v) => form.setData('reference', v)} />
                                    <div className="flex items-end sm:col-span-2">
                                        <Button type="submit" loading={form.processing}>Save expense</Button>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader title="Expenses" description={`${expenses.length} entries`} />
                        <CardBody className="p-0">
                            {expenses.length === 0 ? (
                                <EmptyState title="No expenses recorded yet" description="Record your first expense to start tracking spend." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-5 py-3">Date</th>
                                                <th className="px-5 py-3">Description</th>
                                                <th className="px-5 py-3">Category</th>
                                                <th className="px-5 py-3">Account</th>
                                                <th className="px-5 py-3 text-right">Amount</th>
                                                <th className="px-5 py-3">Status</th>
                                                {canApprove && <th className="px-5 py-3 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {expenses.map((e) => (
                                                <tr key={e.id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-3 text-gray-500">{e.expense_date}</td>
                                                    <td className="px-5 py-3 text-gray-800">
                                                        {e.description}
                                                        {e.reference && <span className="block text-xs text-gray-400">{e.reference}</span>}
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">{e.category ?? '—'}</td>
                                                    <td className="px-5 py-3 text-gray-600">{e.account ?? '—'}</td>
                                                    <td className="px-5 py-3 text-right tabular-nums text-gray-800">{e.amount.toFixed(2)}</td>
                                                    <td className="px-5 py-3">
                                                        <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status_label}</Badge>
                                                    </td>
                                                    {canApprove && (
                                                        <td className="px-5 py-3 text-right">
                                                            {e.status === 'submitted' && (
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="xs" variant="success" onClick={() => router.post(route('expenses.approve', e.id), {}, { preserveScroll: true })}>Approve</Button>
                                                                    <Button size="xs" variant="danger" onClick={() => router.post(route('expenses.reject', e.id), {}, { preserveScroll: true })}>Reject</Button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
