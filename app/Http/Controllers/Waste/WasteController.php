<?php

namespace App\Http\Controllers\Waste;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Waste\Enums\WasteReason;
use App\Domain\Waste\Models\WasteRecord;
use App\Domain\Waste\WasteService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Waste\WasteRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WasteController extends Controller
{
    public function __construct(protected WasteService $waste) {}

    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Waste/Index', [
            'branches' => $tenant->branches()->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'items' => Ingredient::query()->orderBy('name')->get()
                ->map(fn (Ingredient $i) => [
                    'value' => 'ingredient:'.$i->getKey(),
                    'label' => $i->name,
                    'type' => 'ingredient',
                    'id' => $i->getKey(),
                ]),
            'reasons' => collect(WasteReason::cases())
                ->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()])->values(),
            'records' => WasteRecord::query()
                ->with(['item', 'branch:id,name', 'recorder:id,name'])
                ->latest('id')
                ->limit(100)
                ->get()
                ->map(fn (WasteRecord $record) => [
                    'id' => $record->getKey(),
                    'item_name' => $record->item?->name ?? 'Unknown',
                    'branch' => $record->branch?->name,
                    'quantity' => (float) $record->quantity,
                    'cost' => (float) $record->cost,
                    'reason' => $record->reason->value,
                    'reason_label' => $record->reason->label(),
                    'status' => $record->status,
                    'notes' => $record->notes,
                    'recorded_by' => $record->recorder?->name,
                    'recorded_at' => $record->created_at?->toIso8601String(),
                ]),
            'approvalThreshold' => $tenant->getSetting('waste.approval_threshold'),
        ]);
    }

    public function store(WasteRequest $request): RedirectResponse
    {
        $record = $this->waste->record($request->validated(), $request->user());

        $message = $record->status === 'pending'
            ? 'Waste recorded — pending approval.'
            : 'Waste recorded.';

        return back()->with('success', $message);
    }

    public function approve(Request $request, WasteRecord $record): RedirectResponse
    {
        $this->waste->approve($record, $request->user());

        return back()->with('success', 'Waste approved.');
    }

    public function reject(Request $request, WasteRecord $record): RedirectResponse
    {
        $this->waste->reject($record, $request->user());

        return back()->with('success', 'Waste rejected.');
    }
}
