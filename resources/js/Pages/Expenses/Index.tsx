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
    const { auth, flash } = usePage().props;
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

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Expenses</h2>
                    {canManage && (
                        <button
                            onClick={() => setShowCategory((v) => !v)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            {showCategory ? 'Close' : 'Expense categories'}
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Expenses" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    {autoApproveLimit !== null && (
                        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Expenses up to {autoApproveLimit} are auto-approved; larger amounts need approval.
                        </div>
                    )}

                    {showCategory && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New category</h3>
                            <form onSubmit={submitCategory} className="flex items-end gap-2">
                                <input
                                    className="flex-1 rounded-md border-gray-300 text-sm"
                                    placeholder="Category name"
                                    value={catForm.data.name}
                                    onChange={(e) => catForm.setData('name', e.target.value)}
                                    required
                                />
                                <select className="rounded-md border-gray-300 text-sm" value={catForm.data.type} onChange={(e) => catForm.setData('type', e.target.value)}>
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                    Add
                                </button>
                            </form>
                        </div>
                    )}

                    {canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Record expense</h3>
                            <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="text-xs text-gray-500">Description</label>
                                    <input className="block w-full rounded-md border-gray-300 text-sm" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Amount</label>
                                    <input type="number" step="0.01" className="block w-full rounded-md border-gray-300 text-sm" value={form.data.amount} onChange={(e) => form.setData('amount', Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Date</label>
                                    <input type="date" className="block w-full rounded-md border-gray-300 text-sm" value={form.data.expense_date} onChange={(e) => form.setData('expense_date', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Category</label>
                                    <select className="block w-full rounded-md border-gray-300 text-sm" value={form.data.expense_category_id} onChange={(e) => form.setData('expense_category_id', e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">None</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Account</label>
                                    <select className="block w-full rounded-md border-gray-300 text-sm" value={form.data.financial_account_id} onChange={(e) => form.setData('financial_account_id', e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">None</option>
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Branch</label>
                                    <select className="block w-full rounded-md border-gray-300 text-sm" value={form.data.branch_id} onChange={(e) => form.setData('branch_id', e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">Company-wide</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Reference</label>
                                    <input className="block w-full rounded-md border-gray-300 text-sm" value={form.data.reference} onChange={(e) => form.setData('reference', e.target.value)} />
                                </div>
                                <div className="flex items-end sm:col-span-2">
                                    <button type="submit" disabled={form.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                        Save expense
                                    </button>
                                    {Object.values(form.errors)[0] && <p className="ml-3 text-sm text-red-600">{Object.values(form.errors)[0]}</p>}
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Expenses</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Description</th>
                                    <th className="py-2">Category</th>
                                    <th className="py-2">Account</th>
                                    <th className="py-2 text-right">Amount</th>
                                    <th className="py-2">Status</th>
                                    {canApprove && <th className="py-2 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expenses.map((e) => (
                                    <tr key={e.id}>
                                        <td className="py-3 text-gray-500">{e.expense_date}</td>
                                        <td className="py-3 text-gray-800">
                                            {e.description}
                                            {e.reference && <span className="block text-xs text-gray-400">{e.reference}</span>}
                                        </td>
                                        <td className="py-3 text-gray-600">{e.category}</td>
                                        <td className="py-3 text-gray-600">{e.account}</td>
                                        <td className="py-3 text-right text-gray-800">{e.amount.toFixed(2)}</td>
                                        <td className="py-3">
                                            <span
                                                className={
                                                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                                                    (e.status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : e.status === 'submitted'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : 'bg-gray-200 text-gray-600')
                                                }
                                            >
                                                {e.status_label}
                                            </span>
                                        </td>
                                        {canApprove && (
                                            <td className="py-3 text-right">
                                                {e.status === 'submitted' && (
                                                    <div className="flex justify-end gap-2 text-xs">
                                                        <button onClick={() => router.post(route('expenses.approve', e.id), {}, { preserveScroll: true })} className="text-green-600 hover:text-green-700">Approve</button>
                                                        <button onClick={() => router.post(route('expenses.reject', e.id), {}, { preserveScroll: true })} className="text-red-600 hover:text-red-700">Reject</button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">No expenses recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
