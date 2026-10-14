<?php

namespace App\Http\Controllers\Customers;

use App\Domain\Customers\CustomerSegmentationService;
use App\Domain\Customers\Models\Customer;
use App\Domain\Loyalty\LoyaltyService;
use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\CustomerRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function __construct(
        protected LoyaltyService $loyalty,
        protected CustomerSegmentationService $segmentation,
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $segment = $request->string('segment')->toString();
        $status = $request->string('status')->toString();
        $points = $request->string('points')->toString();
        $tenant = $request->user()->tenant;

        $profiles = $this->segmentation->profiles($tenant)->keyBy('customer_id');
        $summary = $this->segmentation->summary($tenant);

        $segmentIds = $segment !== ''
            ? $profiles->filter(fn (array $profile) => $profile['segment'] === $segment)->keys()->all()
            : null;

        $customers = Customer::query()
            ->with('loyaltyAccount')
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->when($segmentIds !== null, fn ($q) => $q->whereIn('id', $segmentIds))
            ->when($points === 'has', fn ($q) => $q->whereHas('loyaltyAccount', fn ($w) => $w->where('points_balance', '>', 0)))
            ->when($points === 'zero', fn ($q) => $q->where(
                fn ($w) => $w->whereDoesntHave('loyaltyAccount')->orWhereHas('loyaltyAccount', fn ($x) => $x->where('points_balance', '<=', 0)),
            ))
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Customer $customer) => [
                'id' => $customer->getKey(),
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'notes' => $customer->notes,
                'tags' => $customer->tags ?? [],
                'orders_count' => (int) ($customer->orders_count ?? 0),
                'orders_sum_total' => (float) ($customer->orders_sum_total ?? 0),
                'points' => $customer->loyaltyAccount?->points_balance ?? 0,
                'segment' => $profiles->get($customer->getKey())['segment'] ?? null,
                'visits' => $profiles->get($customer->getKey())['visits'] ?? 0,
                'is_active' => $customer->is_active,
                'is_marketing_opt_in' => $customer->is_marketing_opt_in,
            ]);

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'summary' => $summary,
            'metrics' => $this->metrics($tenant, $summary, $profiles),
            'segments' => collect(CustomerSegmentationService::SEGMENTS)
                ->map(fn (string $label, string $key) => ['value' => $key, 'label' => $label])
                ->values(),
            'loyaltyEnabled' => $this->loyalty->enabled($tenant),
            'filters' => ['search' => $search, 'segment' => $segment, 'status' => $status, 'points' => $points],
        ]);
    }

    public function show(Request $request, Customer $customer): Response
    {
        $tenant = $request->user()->tenant;

        abort_unless($customer->tenant_id === $tenant->getKey(), 404);

        $profile = $this->segmentation->profiles($tenant)
            ->firstWhere('customer_id', $customer->getKey());

        $orders = Order::query()
            ->where('customer_id', $customer->getKey())
            ->orderByDesc('placed_at')
            ->limit(20)
            ->get(['id', 'order_number', 'status', 'total', 'currency', 'placed_at'])
            ->map(fn (Order $order) => [
                'id' => $order->getKey(),
                'number' => $order->order_number,
                'status' => $order->status?->value ?? $order->status,
                'total' => (float) $order->total,
                'currency' => $order->currency,
                'placed_at' => $order->placed_at?->toIso8601String(),
            ]);

        return Inertia::render('Customers/Show', [
            'customer' => [
                'id' => $customer->getKey(),
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'notes' => $customer->notes,
                'tags' => $customer->tags ?? [],
                'is_active' => $customer->is_active,
                'is_marketing_opt_in' => $customer->is_marketing_opt_in,
                'created_at' => $customer->created_at?->toIso8601String(),
                'points' => $customer->loyaltyAccount?->points_balance ?? 0,
            ],
            'profile' => $profile,
            'orders' => $orders,
            'loyaltyEnabled' => $this->loyalty->enabled($tenant),
        ]);
    }

    /** CSV audience export for a segment — the marketing list. */
    public function export(Request $request): StreamedResponse
    {
        $tenant = $request->user()->tenant;
        $segment = $request->string('segment')->toString();
        $optIn = $request->boolean('opt_in');

        $rows = $this->segmentation->profiles($tenant);

        if ($segment !== '') {
            $rows = $rows->where('segment', $segment)->values();
        }

        if ($optIn) {
            $consented = Customer::query()->where('is_marketing_opt_in', true)->pluck('id')->all();
            $rows = $rows->whereIn('customer_id', $consented)->values();
        }

        $filename = 'customers-'.($segment !== '' ? $segment : 'all').'-'.now()->format('Ymd').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Phone', 'Email', 'Segment', 'Visits', 'Orders', 'Lifetime spend', 'Last order']);
            foreach ($rows as $profile) {
                fputcsv($out, [
                    $profile['name'],
                    $profile['phone'],
                    $profile['email'],
                    CustomerSegmentationService::SEGMENTS[$profile['segment']] ?? $profile['segment'],
                    $profile['visits'] ?? 0,
                    $profile['orders'],
                    $profile['spend'],
                    $profile['last_order_at'],
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
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

    /**
     * @param  array<string, mixed>  $summary
     * @param  Collection<int, array<string, mixed>>  $profiles
     * @return array<string, int|float>
     */
    protected function metrics(Tenant $tenant, array $summary, Collection $profiles): array
    {
        return [
            'total' => Customer::query()->count(),
            'active' => Customer::query()->where('is_active', true)->count(),
            'points' => (int) LoyaltyAccount::query()->sum('points_balance'),
            'spend' => $summary['spend'],
            'orders' => (int) $profiles->sum('orders'),
        ];
    }
}
