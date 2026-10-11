<?php

namespace App\Http\Controllers\Tables;

use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tables\Models\DiningArea;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tables\TableRequest;
use App\Http\Requests\Tables\TableStatusRequest;
use App\Http\Requests\Tables\TableTransferRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TableController extends Controller
{
    public function __construct(protected TableService $tables) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        $branchId = $request->integer('branch_id')
            ?: ($tenant->primaryBranch?->getKey() ?? $tenant->branches()->orderBy('id')->value('id'));

        return Inertia::render('Tables/Index', [
            'branches' => Branch::query()->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'branchId' => $branchId,
            'areas' => DiningArea::query()
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->orderBy('sort_order')->get()
                ->map(fn (DiningArea $a) => ['id' => $a->getKey(), 'name' => $a->name]),
            'tables' => Table::query()
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->with([
                    'diningArea:id,name',
                    'orders' => fn ($q) => $q->whereNotIn('status', ['completed', 'voided'])->select('id', 'table_id', 'order_number', 'total'),
                ])
                ->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (Table $table) => [
                    'id' => $table->getKey(),
                    'name' => $table->name,
                    'seats' => $table->seats,
                    'status' => $table->status->value,
                    'dining_area' => $table->diningArea?->name,
                    'open_orders' => $table->orders->map(fn ($order) => [
                        'id' => $order->getKey(),
                        'order_number' => $order->order_number,
                        'total' => (float) $order->total,
                    ])->values(),
                ]),
            'statuses' => collect(TableStatus::cases())
                ->map(fn (TableStatus $s) => ['value' => $s->value, 'label' => $s->label()])->values(),
        ]);
    }

    public function store(TableRequest $request): RedirectResponse
    {
        Table::create($this->attributes($request->validated()));

        return back()->with('success', 'Table created.');
    }

    public function update(TableRequest $request, Table $table): RedirectResponse
    {
        $table->update($this->attributes($request->validated()));

        return back()->with('success', 'Table updated.');
    }

    public function destroy(Table $table): RedirectResponse
    {
        if ($table->hasOpenOrders()) {
            return back()->with('error', 'Cannot remove a table with open orders.');
        }

        $table->delete();

        return back()->with('success', 'Table removed.');
    }

    public function setStatus(TableStatusRequest $request, Table $table): RedirectResponse
    {
        $this->tables->setStatus($table, TableStatus::from($request->validated('status')));

        return back()->with('success', 'Table status updated.');
    }

    public function transfer(TableTransferRequest $request): RedirectResponse
    {
        $order = Order::query()->findOrFail($request->validated('order_id'));
        $table = Table::query()->findOrFail($request->validated('table_id'));

        $this->tables->transfer($order, $table);

        return back()->with('success', 'Order moved to '.$table->name.'.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function attributes(array $data): array
    {
        $data['seats'] = $data['seats'] ?? 2;
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return $data;
    }
}
