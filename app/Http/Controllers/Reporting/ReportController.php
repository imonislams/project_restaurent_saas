<?php

namespace App\Http\Controllers\Reporting;

use App\Domain\Branches\Models\Branch;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Reporting\ReportService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /** Report type => label. Keys map to ReportService method names. */
    public const TYPES = [
        'sales' => 'Sales summary',
        'products' => 'Product performance',
        'categories' => 'Category performance',
        'payments' => 'Payment report',
        'cash' => 'Cash & shifts',
        'inventory' => 'Inventory report',
        'purchases' => 'Purchase report',
        'waste' => 'Waste report',
        'expenses' => 'Expense report',
        'profit' => 'Profit & loss',
        'tax' => 'Tax report',
        'staff' => 'Staff report',
        'branches' => 'Branch comparison',
        'hourly' => 'Hourly sales',
        'loyalty' => 'Loyalty',
    ];

    public function __construct(protected ReportService $reports) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        $type = $request->string('type')->toString();
        $type = array_key_exists($type, self::TYPES) ? $type : 'sales';

        $branchId = $request->integer('branch_id') ?: null;
        $branch = $branchId ? Branch::query()->find($branchId) : null;

        $period = ReportPeriod::make(
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
            $branchId,
            $tenant,
            $branch,
        );

        return Inertia::render('Reports/Index', [
            'types' => collect(self::TYPES)
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'type' => $type,
            'title' => self::TYPES[$type],
            'filters' => [
                'from' => $period->from->toDateString(),
                'to' => $period->to->toDateString(),
                'branch_id' => $branchId,
            ],
            'branches' => $tenant->branches()->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'timezone' => $period->timezone,
            'currency' => $tenant->getSetting('region.currency', 'USD'),
            'report' => $this->reports->{$type}($period),
        ]);
    }
}
