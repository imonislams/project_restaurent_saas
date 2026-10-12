<?php

namespace App\Http\Controllers\Customers;

use App\Domain\Customers\Models\Customer;
use App\Domain\Loyalty\LoyaltyService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\CustomerRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(protected LoyaltyService $loyalty) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        return Inertia::render('Customers/Index', [
            'customers' => Customer::query()
                ->with('loyaltyAccount')
                ->withCount('orders')
                ->withSum('orders', 'total')
                ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                ->orderBy('name')
                ->limit(100)
                ->get()
                ->map(fn (Customer $customer) => [
                    'id' => $customer->getKey(),
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'notes' => $customer->notes,
                    'orders_count' => (int) ($customer->orders_count ?? 0),
                    'orders_sum_total' => (float) ($customer->orders_sum_total ?? 0),
                    'points' => $customer->loyaltyAccount?->points_balance ?? 0,
                    'is_active' => $customer->is_active,
                ]),
            'loyaltyEnabled' => $this->loyalty->enabled($request->user()->tenant),
            'filters' => ['search' => $search],
        ]);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        Customer::create($request->validated());

        return back()->with('success', 'Customer created.');
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        return back()->with('success', 'Customer updated.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();

        return back()->with('success', 'Customer removed.');
    }
}
