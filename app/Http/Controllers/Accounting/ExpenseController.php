<?php

namespace App\Http\Controllers\Accounting;

use App\Domain\Accounting\Enums\AccountType;
use App\Domain\Accounting\ExpenseService;
use App\Domain\Accounting\Models\Expense;
use App\Domain\Accounting\Models\ExpenseCategory;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Branches\Models\Branch;
use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\ExpenseCategoryRequest;
use App\Http\Requests\Accounting\ExpenseRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function __construct(protected ExpenseService $expenses) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Expenses/Index', [
            'branches' => $tenant->branches()->whereIn('id', $request->user()->accessibleBranchIds())->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'categories' => ExpenseCategory::query()->orderBy('name')->get()
                ->map(fn (ExpenseCategory $c) => ['id' => $c->getKey(), 'name' => $c->name, 'type' => $c->type]),
            'accounts' => FinancialAccount::query()->orderBy('name')->get()
                ->map(fn (FinancialAccount $a) => ['id' => $a->getKey(), 'name' => $a->name, 'type' => $a->type->value]),
            'expenses' => Expense::query()
                ->with(['category:id,name', 'branch:id,name', 'account:id,name', 'creator:id,name'])
                ->latest('expense_date')
                ->limit(100)
                ->get()
                ->map(fn (Expense $expense) => [
                    'id' => $expense->getKey(),
                    'description' => $expense->description,
                    'amount' => (float) $expense->amount,
                    'expense_date' => $expense->expense_date?->toDateString(),
                    'category' => $expense->category?->name,
                    'branch' => $expense->branch?->name,
                    'account' => $expense->account?->name,
                    'status' => $expense->status->value,
                    'status_label' => $expense->status->label(),
                    'created_by' => $expense->creator?->name,
                    'reference' => $expense->reference,
                ]),
            'autoApproveLimit' => $tenant->getSetting('expenses.auto_approve_limit'),
            'accountTypes' => collect(AccountType::cases())
                ->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()])->values(),
        ]);
    }

    public function store(ExpenseRequest $request): RedirectResponse
    {
        $expense = $this->expenses->create($request->validated(), $request->user());

        $message = $expense->status->value === 'approved'
            ? 'Expense recorded and approved.'
            : 'Expense recorded — pending approval.';

        return back()->with('success', $message);
    }

    public function approve(Request $request, Expense $expense): RedirectResponse
    {
        $this->expenses->approve($expense, $request->user());

        return back()->with('success', 'Expense approved.');
    }

    public function reject(Request $request, Expense $expense): RedirectResponse
    {
        $this->expenses->reject($expense, $request->user());

        return back()->with('success', 'Expense rejected.');
    }

    public function storeCategory(ExpenseCategoryRequest $request): RedirectResponse
    {
        ExpenseCategory::create($request->validated());

        return back()->with('success', 'Category created.');
    }
}
