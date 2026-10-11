<?php

namespace App\Http\Controllers\Purchasing;

use App\Domain\Purchasing\Models\Supplier;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchasing\SupplierRequest;
use Illuminate\Http\RedirectResponse;

class SupplierController extends Controller
{
    public function store(SupplierRequest $request): RedirectResponse
    {
        Supplier::create($request->validated());

        return back()->with('success', 'Supplier created.');
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return back()->with('success', 'Supplier updated.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return back()->with('success', 'Supplier removed.');
    }
}
