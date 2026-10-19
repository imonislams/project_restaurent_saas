<?php

namespace App\Http\Controllers\Reporting;

use App\Domain\Branches\Models\Branch;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Reporting\ReportService;
use App\Http\Controllers\Concerns\ResolvesActiveBranch;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    use ResolvesActiveBranch;

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
        'customers' => 'Customer analytics',
    ];

    public function __construct(protected ReportService $reports) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenant = $user->tenant;

        $type = $request->string('type')->toString();
        $type = array_key_exists($type, self::TYPES) ? $type : 'sales';

        // Reports default to the active branch. "All branches" is only available
        // to users with tenant-wide branch access.
        $tenantWide = $user->hasTenantWideBranchAccess();
        $accessible = $user->accessibleBranchIds();
        $rawBranch = $request->string('branch_id')->toString();
        $active = $this->activeBranch($request);

        if ($rawBranch === 'all' && $tenantWide) {
            $branchId = null;
        } elseif ($rawBranch !== '' && $rawBranch !== 'all' && in_array((int) $rawBranch, $accessible, true)) {
            $branchId = (int) $rawBranch;
        } else {
            $branchId = $active?->getKey();
        }

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
            'branches' => Branch::query()
                ->when(! $tenantWide, fn ($q) => $q->whereIn('id', $accessible))
                ->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'canViewAllBranches' => $tenantWide,
            'timezone' => $period->timezone,
            'currency' => $tenant->getSetting('region.currency', 'USD'),
            'report' => $this->reports->{$type}($period),
        ]);
    }
}
