<?php

namespace App\Http\Controllers\Delivery;

use App\Domain\Branches\Models\Branch;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Http\Controllers\Controller;
use App\Http\Requests\Delivery\DeliveryZoneRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryZoneController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;

        return Inertia::render('Delivery/Index', [
            'branches' => $tenant->branches()->orderBy('name')->get()
                ->map(fn (Branch $b) => ['id' => $b->getKey(), 'name' => $b->name]),
            'zones' => DeliveryZone::query()->with('branch:id,name')->orderBy('name')->get()
                ->map(fn (DeliveryZone $zone) => [
                    'id' => $zone->getKey(),
                    'name' => $zone->name,
                    'branch' => $zone->branch?->name,
                    'fee' => (float) $zone->fee,
                    'min_order' => (float) $zone->min_order,
                    'is_active' => $zone->is_active,
                ]),
        ]);
    }

    public function store(DeliveryZoneRequest $request): RedirectResponse
    {
        DeliveryZone::create($request->validated());

        return back()->with('success', 'Delivery zone created.');
    }

    public function update(DeliveryZoneRequest $request, DeliveryZone $deliveryZone): RedirectResponse
    {
        $deliveryZone->update($request->validated());

        return back()->with('success', 'Delivery zone updated.');
    }

    public function destroy(DeliveryZone $deliveryZone): RedirectResponse
    {
        $deliveryZone->delete();

        return back()->with('success', 'Delivery zone removed.');
    }
}
