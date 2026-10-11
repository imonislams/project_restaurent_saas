import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface AccountRow {
    id: number;
    name: string;
    type: string;
    type_label: string;
    branch: string | null;
    opening_balance: number;
    balance: number;
    is_active: boolean;
}

interface TransferRow {
    id: number;
    from: string | null;
    to: string | null;
    amount: number;
    reference: string | null;
    at: string | null;
    by: string | null;
}

export default function AccountsIndex({
    branches,
    accounts,
    transfers,
    accountTypes,
}: {
    branches: { id: number; name: string }[];
    accounts: AccountRow[];
    transfers: TransferRow[];
    accountTypes: { value: string; label: string }[];
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('accounts.manage');

    const [showAccount, setShowAccount] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);

    const accountForm = useForm({
        name: '',
        type: accountTypes[0]?.value ?? 'cash',
        branch_id: '' as number | '',
        opening_balance: 0,
    });

    const transferForm = useForm({
        from_account_id: accounts[0]?.id ?? ('' as number | ''),
        to_account_id: accounts[1]?.id ?? ('' as number | ''),
        amount: 0,
        reference: '',
        notes: '',
    });

    const submitAccount: FormEventHandler = (e) => {
        e.preventDefault();
        accountForm.post(route('accounts.store'), {
            preserveScroll: true,
            onSuccess: () => {
                accountForm.reset('name', 'opening_balance');
                setShowAccount(false);
            },
        });
    };

    const submitTransfer: FormEventHandler = (e) => {
        e.preventDefault();
        transferForm.post(route('accounts.transfer'), {
            preserveScroll: true,
            onSuccess: () => transferForm.reset('amount', 'reference', 'notes'),
        });
    };

    const total = accounts.reduce((sum, a) => sum + a.balance, 0);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Accounts</h2>
                    {canManage && (
                        <div className="flex gap-2">
                            <button onClick={() => setShowTransfer((v) => !v)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                {showTransfer ? 'Close' : 'Transfer'}
                            </button>
                            <button onClick={() => setShowAccount((v) => !v)} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                {showAccount ? 'Close' : 'Add account'}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <Head title="Accounts" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}

                    {showAccount && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New account</h3>
                            <form onSubmit={submitAccount} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Name</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={accountForm.data.name} onChange={(e) => accountForm.setData('name', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Type</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={accountForm.data.type} onChange={(e) => accountForm.setData('type', e.target.value)}>
                                        {accountTypes.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Branch</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={accountForm.data.branch_id} onChange={(e) => accountForm.setData('branch_id', e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">Company-wide</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Opening balance</label>
                                    <input type="number" step="0.01" className="block w-32 rounded-md border-gray-300 text-sm" value={accountForm.data.opening_balance} onChange={(e) => accountForm.setData('opening_balance', Number(e.target.value))} />
                                </div>
                                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Create</button>
                            </form>
                        </div>
                    )}

                    {showTransfer && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Transfer between accounts</h3>
                            <form onSubmit={submitTransfer} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">From</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={transferForm.data.from_account_id} onChange={(e) => transferForm.setData('from_account_id', Number(e.target.value))}>
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">To</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={transferForm.data.to_account_id} onChange={(e) => transferForm.setData('to_account_id', Number(e.target.value))}>
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Amount</label>
                                    <input type="number" step="0.01" className="block w-32 rounded-md border-gray-300 text-sm" value={transferForm.data.amount} onChange={(e) => transferForm.setData('amount', Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Reference</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={transferForm.data.reference} onChange={(e) => transferForm.setData('reference', e.target.value)} />
                                </div>
                                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Transfer</button>
                                {Object.values(transferForm.errors)[0] && <p className="text-sm text-red-600">{Object.values(transferForm.errors)[0]}</p>}
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-gray-900">Accounts</h3>
                                <span className="text-sm text-gray-500">Total: {total.toFixed(2)}</span>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="py-2">Name</th>
                                        <th className="py-2">Type</th>
                                        <th className="py-2">Branch</th>
                                        <th className="py-2 text-right">Opening</th>
                                        <th className="py-2 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {accounts.map((a) => (
                                        <tr key={a.id}>
                                            <td className="py-3 text-gray-800">{a.name}</td>
                                            <td className="py-3 text-gray-600">{a.type_label}</td>
                                            <td className="py-3 text-gray-600">{a.branch ?? 'Company-wide'}</td>
                                            <td className="py-3 text-right text-gray-500">{a.opening_balance.toFixed(2)}</td>
                                            <td className={'py-3 text-right font-medium ' + (a.balance < 0 ? 'text-red-600' : 'text-gray-800')}>{a.balance.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {accounts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">No accounts yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-base font-semibold text-gray-900">Recent transfers</h3>
                            <ul className="space-y-2 text-sm">
                                {transfers.map((t) => (
                                    <li key={t.id} className="flex justify-between text-gray-600">
                                        <span>
                                            {t.from} → {t.to}
                                        </span>
                                        <span>{t.amount.toFixed(2)}</span>
                                    </li>
                                ))}
                                {transfers.length === 0 && <li className="text-gray-400">No transfers yet.</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
