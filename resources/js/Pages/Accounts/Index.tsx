import { Button, Card, CardBody, CardHeader, EmptyState, KpiCard, PageHeader, SelectField, TextField } from '@/Components/ui';
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
    const { auth, flash } = usePage().props as Record<string, any>;
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
        transferForm.post(route('accounts.transfer'), { preserveScroll: true, onSuccess: () => transferForm.reset('amount', 'reference', 'notes') });
    };

    const total = accounts.reduce((sum, a) => sum + a.balance, 0);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Accounts"
                    description="Cash, bank and wallet balances across your branches."
                    actions={
                        canManage && (
                            <>
                                <Button size="sm" variant="secondary" onClick={() => setShowTransfer((v) => !v)}>
                                    {showTransfer ? 'Close' : 'Transfer'}
                                </Button>
                                <Button size="sm" onClick={() => setShowAccount((v) => !v)}>
                                    {showAccount ? 'Close' : 'Add account'}
                                </Button>
                            </>
                        )
                    }
                />
            }
        >
            <Head title="Accounts" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <KpiCard label="Total balance" value={total.toFixed(2)} tone={total < 0 ? 'danger' : 'neutral'} />
                        <KpiCard label="Accounts" value={accounts.length} />
                        <KpiCard label="Transfers" value={transfers.length} />
                    </div>

                    {showAccount && canManage && (
                        <Card>
                            <CardHeader title="New account" />
                            <CardBody>
                                <form onSubmit={submitAccount} className="flex flex-wrap items-end gap-3">
                                    <TextField label="Name" className="w-56" value={accountForm.data.name} error={accountForm.errors.name} onChange={(v) => accountForm.setData('name', v)} />
                                    <SelectField label="Type" className="w-44" value={accountForm.data.type} options={accountTypes} onChange={(v) => accountForm.setData('type', v)} />
                                    <SelectField
                                        label="Branch"
                                        className="w-44"
                                        value={accountForm.data.branch_id === '' ? '' : String(accountForm.data.branch_id)}
                                        options={[{ value: '', label: 'Company-wide' }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                                        onChange={(v) => accountForm.setData('branch_id', v ? Number(v) : '')}
                                    />
                                    <TextField label="Opening balance" type="number" className="w-40" value={String(accountForm.data.opening_balance)} error={accountForm.errors.opening_balance} onChange={(v) => accountForm.setData('opening_balance', Number(v))} />
                                    <Button type="submit" loading={accountForm.processing}>Create</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    {showTransfer && canManage && (
                        <Card>
                            <CardHeader title="Transfer between accounts" />
                            <CardBody>
                                <form onSubmit={submitTransfer} className="flex flex-wrap items-end gap-3">
                                    <SelectField label="From" className="w-44" value={String(transferForm.data.from_account_id)} options={accounts.map((a) => ({ value: String(a.id), label: a.name }))} onChange={(v) => transferForm.setData('from_account_id', Number(v))} />
                                    <SelectField label="To" className="w-44" value={String(transferForm.data.to_account_id)} options={accounts.map((a) => ({ value: String(a.id), label: a.name }))} onChange={(v) => transferForm.setData('to_account_id', Number(v))} />
                                    <TextField label="Amount" type="number" className="w-40" value={String(transferForm.data.amount)} error={transferForm.errors.amount} onChange={(v) => transferForm.setData('amount', Number(v))} />
                                    <TextField label="Reference" className="w-48" value={transferForm.data.reference} onChange={(v) => transferForm.setData('reference', v)} />
                                    <Button type="submit" loading={transferForm.processing}>Transfer</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader title="Accounts" description={`Total ${total.toFixed(2)}`} />
                            <CardBody className="p-0">
                                {accounts.length === 0 ? (
                                    <EmptyState title="No accounts yet" description="Add a cash or bank account to start tracking money." />
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-5 py-3">Name</th>
                                                <th className="px-5 py-3">Type</th>
                                                <th className="px-5 py-3">Branch</th>
                                                <th className="px-5 py-3 text-right">Opening</th>
                                                <th className="px-5 py-3 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {accounts.map((a) => (
                                                <tr key={a.id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-3 font-medium text-gray-800">{a.name}</td>
                                                    <td className="px-5 py-3 text-gray-600">{a.type_label}</td>
                                                    <td className="px-5 py-3 text-gray-600">{a.branch ?? 'Company-wide'}</td>
                                                    <td className="px-5 py-3 text-right tabular-nums text-gray-500">{a.opening_balance.toFixed(2)}</td>
                                                    <td className={'px-5 py-3 text-right font-medium tabular-nums ' + (a.balance < 0 ? 'text-red-600' : 'text-gray-800')}>{a.balance.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader title="Recent transfers" />
                            <CardBody>
                                {transfers.length === 0 ? (
                                    <p className="text-sm text-gray-500">No transfers yet.</p>
                                ) : (
                                    <ul className="space-y-2 text-sm">
                                        {transfers.map((t) => (
                                            <li key={t.id} className="flex items-center justify-between text-gray-600">
                                                <span className="truncate">
                                                    {t.from} → {t.to}
                                                </span>
                                                <span className="shrink-0 tabular-nums font-medium text-gray-800">{t.amount.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
