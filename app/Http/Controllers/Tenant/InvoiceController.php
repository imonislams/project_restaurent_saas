<?php

namespace App\Http\Controllers\Tenant;

use App\Domain\Invoicing\Enums\InvoiceStatus;
use App\Domain\Invoicing\Models\Invoice;
use App\Http\Controllers\Concerns\ResolvesActiveBranch;
use App\Http\Controllers\Controller;
use App\Domain\Branches\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The tenant-facing Bill/Invoice workflow: invoices that served orders feed
 * into. Branch-scoped via the model's global scopes; route binding 404s for
 * invoices outside the user's branches.
 */
class InvoiceController extends Controller
{
    use ResolvesActiveBranch;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenantWide = $user->hasTenantWideBranchAccess();
        $accessible = $user->accessibleBranchIds();
        $active = $this->activeBranch($request);
        $rawBranch = $request->string('branch_id')->toString();

        if ($rawBranch === 'all' && $tenantWide) {
            $branchId = null;
        } elseif ($rawBranch !== '' && $rawBranch !== 'all' && in_array((int) $rawBranch, $accessible, true)) {
            $branchId = (int) $rawBranch;
        } else {
            $branchId = $active?->getKey();
        }

        $status = $request->string('status')->toString() ?: null;
        $search = $request->string('q')->toString() ?: null;

        $invoices = Invoice::query()
            ->with(['table:id,name', 'branch:id,name'])
            ->withCount('orders')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($search, fn ($q) => $q->where('number', 'like', "%{$search}%"))
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Invoice $invoice) => $this->summary($invoice));

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'branches' => Branch::query()
                ->when(! $tenantWide, fn ($q) => $q->whereIn('id', $accessible))
                ->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'canViewAllBranches' => $tenantWide,
            'filters' => [
                'status' => $status,
                'q' => $search,
                'branch_id' => $branchId,
            ],
            'statuses' => collect(InvoiceStatus::cases())
                ->map(fn (InvoiceStatus $s) => ['value' => $s->value, 'label' => $s->label()])->values(),
        ]);
    }

    public function show(Invoice $invoice): Response
    {
        $invoice->load([
            'table:id,name',
            'branch:id,name',
            'customer:id,name',
            'diningSession:id,status',
            'orders.table:id,name',
            'orders.items',
        ]);

        return Inertia::render('Invoices/Show', [
            'invoice' => [
                ...$this->summary($invoice),
                'subtotal' => (float) $invoice->subtotal,
                'discount_total' => (float) $invoice->discount_total,
                'tax_total' => (float) $invoice->tax_total,
                'service_charge' => (float) $invoice->service_charge,
                'customer_name' => $invoice->customer?->name,
                'issued_at' => $invoice->issued_at?->toIso8601String(),
                'finalized_at' => $invoice->finalized_at?->toIso8601String(),
                'orders' => $invoice->orders->map(fn ($order) => [
                    'id' => $order->getKey(),
                    'order_number' => $order->order_number,
                    'status' => $order->status->value,
                    'fulfillment_status' => $order->fulfillment_status->value,
                    'table_name' => $order->table?->name,
                    'total' => (float) $order->total,
                    'paid_total' => (float) $order->paid_total,
                    'amount' => (float) $order->pivot->amount,
                    'placed_at' => $order->placed_at?->toIso8601String(),
                    'items' => $order->items->map(fn ($item) => [
                        'name' => $item->name,
                        'quantity' => (float) $item->quantity,
                        'line_total' => (float) $item->line_total,
                    ]),
                ]),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function summary(Invoice $invoice): array
    {
        return [
            'id' => $invoice->getKey(),
            'number' => $invoice->number,
            'status' => $invoice->status->value,
            'status_label' => $invoice->status->label(),
            'table_name' => $invoice->table?->name,
            'branch_name' => $invoice->branch?->name,
            'orders_count' => $invoice->orders_count ?? $invoice->orders()->count(),
            'total' => (float) $invoice->total,
            'paid_total' => (float) $invoice->paid_total,
            'outstanding' => $invoice->outstanding(),
            'currency' => $invoice->currency,
            'issued_at' => $invoice->issued_at?->toIso8601String(),
            'paid_at' => $invoice->paid_at?->toIso8601String(),
        ];
    }
}
