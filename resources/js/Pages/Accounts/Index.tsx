import Modal from '@/Components/Modal';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
    Tabs,
    ConfirmDialog,
    formatMoney,
} from '@/Components/ui';
import type { TabItem } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

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

const TYPE_BADGE_COLORS: Record<string, string> = {
    bank: 'bg-blue-100 text-blue-800 border-blue-200',
    cash: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    wallet: 'bg-purple-100 text-purple-800 border-purple-200',
    petty_cash: 'bg-amber-100 text-amber-800 border-amber-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
};

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
    const { auth, flash, currency } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('accounts.manage');

    const [activeTab, setActiveTab] = useState<'accounts' | 'transfers'>('accounts');
    const [accountSearch, setAccountSearch] = useState('');
    const [transferSearch, setTransferSearch] = useState('');

    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', onConfirm: () => {} });

    // Account Form
    const accountForm = useForm({
        name: '',
        type: accountTypes[0]?.value ?? 'cash',
        branch_id: '' as number | '',
        opening_balance: 0,
    });

    // Transfer Form
    const transferForm = useForm({
        from_account_id: (accounts[0]?.id ?? '') as number | '',
        to_account_id: (accounts[1]?.id ?? accounts[0]?.id ?? '') as number | '',
        amount: 0,
        reference: '',
        notes: '',
    });

    const sameAccountError = transferForm.data.from_account_id === transferForm.data.to_account_id;

    // Source & Destination Accounts for preview
    const fromAccount = useMemo(() => {
        return accounts.find((a) => a.id === Number(transferForm.data.from_account_id));
    }, [accounts, transferForm.data.from_account_id]);

    const toAccount = useMemo(() => {
        return accounts.find((a) => a.id === Number(transferForm.data.to_account_id));
    }, [accounts, transferForm.data.to_account_id]);

    const submitAccount: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingAccount) {
            accountForm.patch(route('accounts.update', editingAccount.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setAccountModalOpen(false);
                    setEditingAccount(null);
                    accountForm.reset();
                },
            });
        } else {
            accountForm.post(route('accounts.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setAccountModalOpen(false);
                    accountForm.reset();
                },
            });
        }
    };

    const submitTransfer: FormEventHandler = (e) => {
        e.preventDefault();
        if (sameAccountError) return;

        transferForm.post(route('accounts.transfer'), {
            preserveScroll: true,
            onSuccess: () => {
                setTransferModalOpen(false);
                transferForm.reset('amount', 'reference', 'notes');
            },
        });
    };

    const handleDeleteAccount = (acc: AccountRow) => {
        setDeleteConfirm({
            open: true,
            title: `Delete Account "${acc.name}"?`,
            message: `Are you sure you want to remove this financial account? Previous transaction histories referencing this account will be archived.`,
            onConfirm: () => {
                router.delete(route('accounts.destroy', acc.id), {
                    preserveScroll: true,
                    onSuccess: () => setDeleteConfirm((prev) => ({ ...prev, open: false })),
                });
            },
        });
    };

    // Open Transfer Modal prefilled with source account
    const handleQuickTransfer = (sourceAccountId: number) => {
        const otherAccount = accounts.find((a) => a.id !== sourceAccountId);
        transferForm.setData({
            from_account_id: sourceAccountId,
            to_account_id: (otherAccount?.id ?? '') as number | '',
            amount: 0,
            reference: '',
            notes: '',
        });
        setTransferModalOpen(true);
    };

    // KPI Metrics
    const totalTreasuryBalance = useMemo(() => accounts.reduce((sum, a) => sum + a.balance, 0), [accounts]);
    const cashAccountsBalance = useMemo(
        () => accounts.filter((a) => a.type === 'cash' || a.type === 'petty_cash').reduce((sum, a) => sum + a.balance, 0),
        [accounts]
    );
    const bankAccountsBalance = useMemo(
        () => accounts.filter((a) => a.type === 'bank' || a.type === 'wallet').reduce((sum, a) => sum + a.balance, 0),
        [accounts]
    );

    // Filtered accounts
    const filteredAccounts = useMemo(() => {
        return accounts.filter((a) => {
            if (!accountSearch) return true;
            const q = accountSearch.toLowerCase();
            return (
                a.name.toLowerCase().includes(q) ||
                a.type_label.toLowerCase().includes(q) ||
                (a.branch && a.branch.toLowerCase().includes(q))
            );
        });
    }, [accounts, accountSearch]);

    // Filtered transfers
    const filteredTransfers = useMemo(() => {
        return transfers.filter((t) => {
            if (!transferSearch) return true;
            const q = transferSearch.toLowerCase();
            return (
                (t.from && t.from.toLowerCase().includes(q)) ||
                (t.to && t.to.toLowerCase().includes(q)) ||
                (t.reference && t.reference.toLowerCase().includes(q)) ||
                (t.by && t.by.toLowerCase().includes(q))
            );
        });
    }, [transfers, transferSearch]);

    const tabs: TabItem[] = [
        {
            key: 'accounts',
            label: 'Financial Accounts',
            badge: accounts.length,
        },
        {
            key: 'transfers',
            label: 'Fund Transfers Ledger',
            badge: transfers.length,
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Financial Accounts & Treasury"
                    description="Monitor cash drawers, operational bank balances, and execute inter-account fund transfers."
                    actions={
                        canManage && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        transferForm.reset();
                                        setTransferModalOpen(true);
                                    }}
                                >
                                    ⇄ Transfer Funds
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        setEditingAccount(null);
                                        accountForm.reset();
                                        setAccountModalOpen(true);
                                    }}
                                >
                                    + Add Account
                                </Button>
                            </div>
                        )
                    }
                />
            }
        >
            <Head title="Financial Accounts & Treasury" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Total Treasury Balance"
                            value={formatMoney(totalTreasuryBalance, currency)}
                            tone={totalTreasuryBalance < 0 ? 'danger' : 'success'}
                            hint="Net liquid balance across all accounts"
                        />
                        <KpiCard
                            label="Cash On Hand & Registers"
                            value={formatMoney(cashAccountsBalance, currency)}
                            hint="Registers, cash drawers & petty cash"
                        />
                        <KpiCard
                            label="Bank & Digital Accounts"
                            value={formatMoney(bankAccountsBalance, currency)}
                            hint="Operating checking & payment gateways"
                        />
                        <KpiCard
                            label="Inter-Account Transfers"
                            value={transfers.length}
                            hint="Audit log of completed internal transfers"
                        />
                    </div>

                    {/* Navigation Tabs */}
                    <Tabs
                        tabs={tabs}
                        value={activeTab}
                        onChange={(tabKey) => setActiveTab(tabKey as any)}
                    />

                    {/* TAB 1: FINANCIAL ACCOUNTS */}
                    {activeTab === 'accounts' && (
                        <Card>
                            <CardHeader
                                title="Active Financial Accounts"
                                description="Bank accounts, cash drawers, and merchant payment processors."
                                action={
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search accounts…"
                                            value={accountSearch}
                                            onChange={(e) => setAccountSearch(e.target.value)}
                                            className="h-9 w-48 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-60"
                                        />
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredAccounts.length === 0 ? (
                                    <EmptyState
                                        title="No Financial Accounts Found"
                                        description="Add cash or bank accounts to begin tracking revenue and paying expenses."
                                        action={
                                            canManage && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingAccount(null);
                                                        accountForm.reset();
                                                        setAccountModalOpen(true);
                                                    }}
                                                >
                                                    Add Account
                                                </Button>
                                            )
                                        }
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Account Name</th>
                                                    <th className="px-6 py-3.5">Account Type</th>
                                                    <th className="px-6 py-3.5">Branch / Scope</th>
                                                    <th className="px-6 py-3.5 text-right">Opening Balance</th>
                                                    <th className="px-6 py-3.5 text-right">Current Balance</th>
                                                    <th className="px-6 py-3.5 text-center">Status</th>
                                                    {canManage && (
                                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredAccounts.map((a) => (
                                                    <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                                            {a.name}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                                                    TYPE_BADGE_COLORS[a.type] ?? 'bg-gray-100 text-gray-800 border-gray-200'
                                                                }`}
                                                            >
                                                                {a.type_label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-gray-600">
                                                            {a.branch ?? 'Company-wide (All Branches)'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-xs tabular-nums text-gray-500">
                                                            {formatMoney(a.opening_balance, currency)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span
                                                                className={`font-mono text-base font-bold tabular-nums ${
                                                                    a.balance < 0
                                                                        ? 'text-rose-600'
                                                                        : 'text-gray-900'
                                                                }`}
                                                            >
                                                                {formatMoney(a.balance, currency)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {a.is_active ? (
                                                                <Badge tone="success">Active</Badge>
                                                            ) : (
                                                                <Badge tone="neutral">Archived</Badge>
                                                            )}
                                                        </td>
                                                        {canManage && (
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => handleQuickTransfer(a.id)}
                                                                    >
                                                                        Transfer
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => {
                                                                            setEditingAccount(a);
                                                                            accountForm.setData({
                                                                                name: a.name,
                                                                                type: a.type,
                                                                                branch_id: '' as any,
                                                                                opening_balance: a.opening_balance,
                                                                            });
                                                                            setAccountModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="danger"
                                                                        onClick={() => handleDeleteAccount(a)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </div>
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
                    )}

                    {/* TAB 2: FUND TRANSFERS LEDGER */}
                    {activeTab === 'transfers' && (
                        <Card>
                            <CardHeader
                                title="Inter-Account Fund Transfers"
                                description="Audit log of cash deposits, bank withdrawals, and register reconciliations."
                                action={
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search transfer ref or account…"
                                            value={transferSearch}
                                            onChange={(e) => setTransferSearch(e.target.value)}
                                            className="h-9 w-52 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary sm:w-60"
                                        />
                                        {canManage && (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    transferForm.reset();
                                                    setTransferModalOpen(true);
                                                }}
                                            >
                                                + New Transfer
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                            <CardBody className="p-0">
                                {filteredTransfers.length === 0 ? (
                                    <EmptyState
                                        title="No Transfers Found"
                                        description="Execute a transfer to move money between cash and bank accounts."
                                    />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3.5">Timestamp</th>
                                                    <th className="px-6 py-3.5">From Account</th>
                                                    <th className="px-6 py-3.5 text-center">Direction</th>
                                                    <th className="px-6 py-3.5">To Account</th>
                                                    <th className="px-6 py-3.5 text-right">Transfer Amount</th>
                                                    <th className="px-6 py-3.5">Reference #</th>
                                                    <th className="px-6 py-3.5">Initiated By</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {filteredTransfers.map((t) => (
                                                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                                                            {t.at ? new Date(t.at).toLocaleString() : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {t.from ?? 'Unknown Account'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-bold text-primary">➔</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {t.to ?? 'Unknown Account'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold tabular-nums text-emerald-700">
                                                            {formatMoney(t.amount, currency)}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                            {t.reference ?? '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-gray-600">
                                                            {t.by ?? 'System'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* MODAL: CREATE / EDIT ACCOUNT */}
            <Modal
                show={accountModalOpen}
                maxWidth="md"
                onClose={() => setAccountModalOpen(false)}
            >
                <form onSubmit={submitAccount} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingAccount ? 'Edit Financial Account' : 'New Financial Account'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setAccountModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Account Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Main Kitchen Petty Cash, Stripe Wallet, Chase Checking"
                                value={accountForm.data.name}
                                onChange={(e) => accountForm.setData('name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {accountForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{accountForm.errors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Account Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={accountForm.data.type}
                                    onChange={(e) => accountForm.setData('type', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    {accountTypes.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Branch Scope
                                </label>
                                <select
                                    value={accountForm.data.branch_id === '' ? '' : String(accountForm.data.branch_id)}
                                    onChange={(e) =>
                                        accountForm.setData('branch_id', e.target.value ? Number(e.target.value) : '')
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">Company-wide (All Branches)</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Opening Balance ({currency})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={accountForm.data.opening_balance}
                                onChange={(e) =>
                                    accountForm.setData('opening_balance', Number(e.target.value))
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                            />
                            {accountForm.errors.opening_balance && (
                                <p className="mt-1 text-xs text-rose-600">
                                    {accountForm.errors.opening_balance}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setAccountModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={accountForm.processing}
                        >
                            {editingAccount ? 'Update Account' : 'Create Account'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: TRANSFER FUNDS */}
            <Modal
                show={transferModalOpen}
                maxWidth="md"
                onClose={() => setTransferModalOpen(false)}
            >
                <form onSubmit={submitTransfer} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Transfer Between Accounts
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Reconcile bank deposits, cash pickups, or drawer floats.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTransferModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    From Account <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={String(transferForm.data.from_account_id)}
                                    onChange={(e) =>
                                        transferForm.setData('from_account_id', Number(e.target.value))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({formatMoney(a.balance, currency)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    To Account <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={String(transferForm.data.to_account_id)}
                                    onChange={(e) =>
                                        transferForm.setData('to_account_id', Number(e.target.value))
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                >
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({formatMoney(a.balance, currency)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {sameAccountError && (
                            <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                                ⚠️ Origin account and destination account cannot be the same.
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Transfer Amount ({currency}) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={transferForm.data.amount}
                                onChange={(e) =>
                                    transferForm.setData('amount', Number(e.target.value))
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {transferForm.errors.amount && (
                                <p className="mt-1 text-xs text-rose-600">{transferForm.errors.amount}</p>
                            )}
                        </div>

                        {/* Live Balance Impact Preview */}
                        {fromAccount && toAccount && !sameAccountError && transferForm.data.amount > 0 && (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-primary space-y-1.5">
                                <span className="font-semibold text-primary block">
                                    Projected Post-Transfer Balances:
                                </span>
                                <div className="flex justify-between">
                                    <span>{fromAccount.name}:</span>
                                    <span className="font-mono font-medium text-rose-700">
                                        {formatMoney(fromAccount.balance - transferForm.data.amount, currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{toAccount.name}:</span>
                                    <span className="font-mono font-medium text-emerald-700">
                                        {formatMoney(toAccount.balance + transferForm.data.amount, currency)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Reference / Slip #
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. DEP-204"
                                    value={transferForm.data.reference}
                                    onChange={(e) =>
                                        transferForm.setData('reference', e.target.value)
                                    }
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Transfer Notes
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. End of day cash drop"
                                    value={transferForm.data.notes}
                                    onChange={(e) => transferForm.setData('notes', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setTransferModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={sameAccountError}
                            loading={transferForm.processing}
                        >
                            Execute Transfer
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM DELETE DIALOG */}
            <ConfirmDialog
                show={deleteConfirm.open}
                title={deleteConfirm.title}
                description={deleteConfirm.message}
                confirmLabel="Confirm Delete"
                tone="danger"
                onConfirm={deleteConfirm.onConfirm}
                onClose={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
            />
        </AuthenticatedLayout>
    );
}
