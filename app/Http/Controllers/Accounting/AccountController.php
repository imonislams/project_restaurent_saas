<?php

namespace App\Http\Controllers\Accounting;

use App\Domain\Accounting\AccountingService;
use App\Domain\Accounting\Enums\AccountType;
use App\Domain\Accounting\Models\AccountTransfer;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Branches\Models\Branch;
use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\AccountRequest;
use App\Http\Requests\Accounting\AccountTransferRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function __construct(protected AccountingService $accounting) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Accounts/Index', [
            'branches' => $tenant->branches()->whereIn('id', $request->user()->accessibleBranchIds())->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'accounts' => FinancialAccount::query()
                ->with('branch:id,name')
                ->orderBy('name')
                ->get()
                ->map(fn (FinancialAccount $account) => [
                    'id' => $account->getKey(),
                    'name' => $account->name,
                    'type' => $account->type->value,
                    'type_label' => $account->type->label(),
                    'branch' => $account->branch?->name,
                    'opening_balance' => (float) $account->opening_balance,
                    'balance' => $account->balance(),
                    'is_active' => $account->is_active,
                ]),
            'transfers' => AccountTransfer::query()
                ->with(['fromAccount:id,name', 'toAccount:id,name', 'creator:id,name'])
                ->latest('transferred_at')
                ->limit(50)
                ->get()
                ->map(fn (AccountTransfer $transfer) => [
                    'id' => $transfer->getKey(),
                    'from' => $transfer->fromAccount?->name,
                    'to' => $transfer->toAccount?->name,
                    'amount' => (float) $transfer->amount,
                    'reference' => $transfer->reference,
                    'at' => $transfer->transferred_at?->toIso8601String(),
                    'by' => $transfer->creator?->name,
                ]),
            'accountTypes' => collect(AccountType::cases())
                ->map(fn ($t) => ['value' => $t->value, 'label' => $t->label()])->values(),
        ]);
    }

    public function store(AccountRequest $request): RedirectResponse
    {
        FinancialAccount::create($request->validated());

        return back()->with('success', 'Account created.');
    }

    public function update(AccountRequest $request, FinancialAccount $account): RedirectResponse
    {
        $account->update($request->validated());

        return back()->with('success', 'Account updated.');
    }

    public function destroy(FinancialAccount $account): RedirectResponse
    {
        $account->delete();

        return back()->with('success', 'Account removed.');
    }

    public function transfer(AccountTransferRequest $request): RedirectResponse
    {
        $from = FinancialAccount::query()->findOrFail($request->validated('from_account_id'));
        $to = FinancialAccount::query()->findOrFail($request->validated('to_account_id'));

        $this->accounting->transfer(
            $from,
            $to,
            (float) $request->validated('amount'),
            $request->user(),
            $request->validated('reference'),
            $request->validated('notes'),
        );

        return back()->with('success', 'Transfer recorded.');
    }
}
