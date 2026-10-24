import Modal from '@/Components/Modal';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    ConfirmDialog,
    EmptyState,
    KpiCard,
    PageHeader,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Search, X } from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';

interface ExpenseRow {
    id: number;
    description: string;
    amount: number;
    expense_date: string | null;
    category: string | null;
    branch: string | null;
    account: string | null;
    status: 'approved' | 'submitted' | 'rejected' | 'draft' | string;
    status_label: string;
    created_by: string | null;
    reference: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    approved: 'success',
    submitted: 'warning',
    rejected: 'danger',
    draft: 'neutral',
};

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

    // UI State
    const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');

    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        open: boolean;
        title: string;
        message: string;
        tone: 'danger' | 'primary';
        confirmLabel: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', tone: 'primary', confirmLabel: 'Confirm', onConfirm: () => {} });

    // Expense Form
    const expenseForm = useForm<{
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
        branch_id: (branches[0]?.id ?? '') as number | '',
        expense_category_id: (categories[0]?.id ?? '') as number | '',
        financial_account_id: (accounts[0]?.id ?? '') as number | '',
        amount: 0,
        expense_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
        reference: '',
        description: '',
        notes: '',
    });

    // Category Form
    const categoryForm = useForm({
        name: '',
        type: 'expense',
    });

    const submitExpense: FormEventHandler = (e) => {
        e.preventDefault();
        expenseForm.post(route('expenses.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setExpenseModalOpen(false);
                expenseForm.reset('amount', 'description', 'reference', 'notes');
            },
        });
    };

    const submitCategory: FormEventHandler = (e) => {
        e.preventDefault();
        categoryForm.post(route('expenses.categories.store'), {
            preserveScroll: true,
            onSuccess: () => {
                categoryForm.reset('name');
                setCategoryModalOpen(false);
            },
        });
    };

    // KPI Metrics
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const pendingExpenses = useMemo(() => expenses.filter((e) => e.status === 'submitted'), [expenses]);
    const pendingCount = pendingExpenses.length;
    const pendingSum = useMemo(() => pendingExpenses.reduce((sum, e) => sum + e.amount, 0), [pendingExpenses]);
    const approvedCount = useMemo(() => expenses.filter((e) => e.status === 'approved').length, [expenses]);

    // Filtered expenses
    const filteredExpenses = useMemo(() => {
        return expenses.filter((e) => {
            if (statusFilter !== 'all' && e.status !== statusFilter) return false;
            if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
            if (branchFilter !== 'all' && e.branch !== branchFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchDesc = e.description.toLowerCase().includes(q);
                const matchRef = e.reference?.toLowerCase().includes(q);
                const matchUser = e.created_by?.toLowerCase().includes(q);
                const matchAcc = e.account?.toLowerCase().includes(q);
                if (!matchDesc && !matchRef && !matchUser && !matchAcc) return false;
            }
            return true;
        });
    }, [expenses, statusFilter, categoryFilter, branchFilter, searchQuery]);

    // Approval / Rejection
    const handleApprove = (expense: ExpenseRow) => {
        setConfirmAction({
            open: true,
            title: `Approve Expense #${expense.id}?`,
            message: `Approving will debit $${expense.amount.toFixed(2)} from account "${expense.account ?? 'Default'}" and post the journal entry.`,
            tone: 'primary',
            confirmLabel: 'Approve Expense',
            onConfirm: () => {
                router.post(
                    route('expenses.approve', expense.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    const handleReject = (expense: ExpenseRow) => {
        setConfirmAction({
            open: true,
            title: `Reject Expense #${expense.id}?`,
            message: `Rejecting this expense leaves financial accounts untouched and sets the record status to Rejected.`,
            tone: 'danger',
            confirmLabel: 'Reject Expense',
            onConfirm: () => {
                router.post(
                    route('expenses.reject', expense.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    const categoryNames = useMemo(() => Array.from(new Set(categories.map((c) => c.name))), [categories]);
    const branchNames = useMemo(() => Array.from(new Set(branches.map((b) => b.name))), [branches]);

    const isAboveAutoApprove = autoApproveLimit !== null && expenseForm.data.amount > autoApproveLimit;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Operating Expenses"
                    description="Record kitchen, operational, and utility expenditures with automated approval thresholds."
                    actions={
                        canManage && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCategoryModalOpen(true)}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Category
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setExpenseModalOpen(true)}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Record Expense
                                </Button>
                            </div>
                        )
                    }
                />
            }
        >
            <Head title="Operating Expenses" />

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

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Total Recorded Expenses"
                            value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            hint={`${expenses.length} total entries`}
                        />
                        <KpiCard
                            label="Awaiting Approval"
                            value={pendingCount}
                            tone={pendingCount > 0 ? 'warning' : 'neutral'}
                            hint={pendingCount > 0 ? `$${pendingSum.toFixed(2)} pending sign-off` : 'No pending reviews'}
                        />
                        <KpiCard
                            label="Approved Expenses"
                            value={approvedCount}
                            tone="success"
                            hint="Posted to financial ledger"
                        />
                        <KpiCard
                            label="Auto-Approve Limit"
                            value={autoApproveLimit ? `$${Number(autoApproveLimit).toFixed(2)}` : 'Unrestricted'}
                            hint={autoApproveLimit ? 'Entries above require approval' : 'All recorded expenses auto-approve'}
                        />
                    </div>

                    {/* Main Expenses Table */}
                    <Card>
                        <CardHeader
                            title="Expense Transactions"
                            description={`${filteredExpenses.length} of ${expenses.length} records`}
                            action={
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search description, reference…"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-8 w-44 sm:w-56 rounded-md border border-input bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        <option value="all">All Categories</option>
                                        {categoryNames.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={branchFilter}
                                        onChange={(e) => setBranchFilter(e.target.value)}
                                        className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        <option value="all">All Branches</option>
                                        {branchNames.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            }
                        />

                        {/* Status Filter Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-6 py-2.5 text-xs">
                            <span className="font-medium text-muted-foreground mr-1">Status:</span>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                    statusFilter === 'all'
                                        ? 'bg-foreground text-background shadow-xs font-semibold'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                All ({expenses.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('submitted')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                    statusFilter === 'submitted'
                                        ? 'bg-amber-600 text-white shadow-xs font-semibold'
                                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                                }`}
                            >
                                Pending Review ({pendingCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('approved')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                    statusFilter === 'approved'
                                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                        : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                                }`}
                            >
                                Approved ({approvedCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('rejected')}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                    statusFilter === 'rejected'
                                        ? 'bg-destructive text-destructive-foreground shadow-xs font-semibold'
                                        : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                }`}
                            >
                                Rejected
                            </button>
                        </div>

                        <CardBody className="p-0">
                            {filteredExpenses.length === 0 ? (
                                <EmptyState
                                    title="No Expense Records Found"
                                    description={
                                        searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                                            ? 'No expense entries match your active search filters.'
                                            : 'No operating expenses logged yet.'
                                    }
                                    action={
                                        canManage && (
                                            <Button
                                                size="sm"
                                                onClick={() => setExpenseModalOpen(true)}
                                            >
                                                Record First Expense
                                            </Button>
                                        )
                                    }
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-28">Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead>Paid From</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead>Recorded By</TableHead>
                                            {canApprove && (
                                                <TableHead className="text-right">Actions</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredExpenses.map((e) => (
                                            <TableRow key={e.id}>
                                                <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                    {e.expense_date ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-foreground">{e.description}</span>
                                                    {e.reference && (
                                                        <span className="block font-mono text-xs text-muted-foreground mt-0.5">
                                                            Ref: {e.reference}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                        {e.category ?? 'General'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {e.branch ?? 'Company-wide'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {e.account ?? 'General Account'}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums text-foreground">
                                                    ${e.amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>
                                                        {e.status_label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {e.created_by ?? 'System'}
                                                </TableCell>
                                                {canApprove && (
                                                    <TableCell className="text-right">
                                                        {e.status === 'submitted' ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                                    onClick={() => handleApprove(e)}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                    onClick={() => handleReject(e)}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground/60">
                                                                Finalized
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* MODAL: RECORD EXPENSE */}
            <Modal
                show={expenseModalOpen}
                maxWidth="lg"
                onClose={() => setExpenseModalOpen(false)}
            >
                <form onSubmit={submitExpense} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Record Operating Expense
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Log operational costs, supplies, or vendor disbursements.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setExpenseModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Weekly vegetable restock, Electricity bill, Cleaning supplies"
                                value={expenseForm.data.description}
                                onChange={(e) => expenseForm.setData('description', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {expenseForm.errors.description && (
                                <p className="mt-1 text-xs text-rose-600">{expenseForm.errors.description}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Amount ($) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={expenseForm.data.amount}
                                    onChange={(e) => expenseForm.setData('amount', Number(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                />
                                {expenseForm.errors.amount && (
                                    <p className="mt-1 text-xs text-rose-600">{expenseForm.errors.amount}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Expense Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={expenseForm.data.expense_date}
                                    onChange={(e) => expenseForm.setData('expense_date', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary focus:ring-primary"
                                    required
                                />
                                {expenseForm.errors.expense_date && (
                                    <p className="mt-1 text-xs text-rose-600">{expenseForm.errors.expense_date}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Category
                                </label>
                                <select
                                    value={expenseForm.data.expense_category_id === '' ? '' : String(expenseForm.data.expense_category_id)}
                                    onChange={(e) => expenseForm.setData('expense_category_id', e.target.value ? Number(e.target.value) : '')}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="">No category</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Branch Location
                                </label>
                                <select
                                    value={expenseForm.data.branch_id === '' ? '' : String(expenseForm.data.branch_id)}
                                    onChange={(e) => expenseForm.setData('branch_id', e.target.value ? Number(e.target.value) : '')}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Financial Account
                                </label>
                                <select
                                    value={expenseForm.data.financial_account_id === '' ? '' : String(expenseForm.data.financial_account_id)}
                                    onChange={(e) => expenseForm.setData('financial_account_id', e.target.value ? Number(e.target.value) : '')}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Payment Method
                                </label>
                                <select
                                    value={expenseForm.data.payment_method}
                                    onChange={(e) => expenseForm.setData('payment_method', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="card">Company Card</option>
                                    <option value="check">Check</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Reference / Receipt #
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. REC-8492"
                                    value={expenseForm.data.reference}
                                    onChange={(e) => expenseForm.setData('reference', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* Approval Threshold Notice */}
                        {isAboveAutoApprove && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                ⚠️ This amount exceeds the auto-approval threshold (${Number(autoApproveLimit).toFixed(2)}).
                                This expense will be submitted as <span className="font-bold underline">Pending Approval</span> and will require a manager review before posting to accounts.
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Additional Notes
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Extra justification, tax notes, or invoice comments"
                                value={expenseForm.data.notes}
                                onChange={(e) => expenseForm.setData('notes', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setExpenseModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={expenseForm.processing}
                        >
                            Record Expense
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: ADD CATEGORY */}
            <Modal
                show={categoryModalOpen}
                maxWidth="sm"
                onClose={() => setCategoryModalOpen(false)}
            >
                <form onSubmit={submitCategory} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Add Expense Category
                        </h3>
                        <button
                            type="button"
                            onClick={() => setCategoryModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Category Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Kitchen Supplies, Marketing, Utilities"
                                value={categoryForm.data.name}
                                onChange={(e) => categoryForm.setData('name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary focus:ring-primary"
                                required
                            />
                            {categoryForm.errors.name && (
                                <p className="mt-1 text-xs text-rose-600">{categoryForm.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Accounting Type
                            </label>
                            <select
                                value={categoryForm.data.type}
                                onChange={(e) => categoryForm.setData('type', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                            >
                                <option value="expense">Expense (Operational Cost)</option>
                                <option value="income">Income (Miscellaneous Credit)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCategoryModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={categoryForm.processing}
                        >
                            Save Category
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM ACTION DIALOG */}
            <ConfirmDialog
                show={confirmAction.open}
                title={confirmAction.title}
                description={confirmAction.message}
                tone={confirmAction.tone}
                confirmLabel={confirmAction.confirmLabel}
                onConfirm={confirmAction.onConfirm}
                onClose={() => setConfirmAction((prev) => ({ ...prev, open: false }))}
            />
        </AuthenticatedLayout>
    );
}
