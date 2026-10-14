<?php

namespace Tests\Feature\Customers;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\CustomerSegmentationService;
use App\Domain\Customers\Models\Customer;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Orders\Models\Order;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Reporting\ReportService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerSegmentationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function customer(string $name): Customer
    {
        return Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => $name,
        ]);
    }

    protected function order(Customer $customer, float $total, int $daysAgo): Order
    {
        return Order::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->owner->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-'.Str::random(8),
            'order_type' => 'counter',
            'status' => 'completed',
            'subtotal' => $total,
            'tax_total' => 0,
            'total' => $total,
            'currency' => 'BDT',
            'placed_at' => now()->subDays($daysAgo),
        ]);
    }

    public function test_customers_are_classified_into_segments(): void
    {
        $champion = $this->customer('Champion');
        foreach (range(1, 5) as $i) {
            $this->order($champion, 1000, 3);
        }

        $loyal = $this->customer('Loyal');
        foreach (range(1, 3) as $i) {
            $this->order($loyal, 200, 5);
        }

        $new = $this->customer('Newcomer');
        $this->order($new, 150, 2);

        $atRisk = $this->customer('At Risk');
        $this->order($atRisk, 400, 50);

        $lost = $this->customer('Gone');
        $this->order($lost, 300, 120);

        $profiles = app(CustomerSegmentationService::class)->profiles($this->tenant)->keyBy('name');

        $this->assertSame('champions', $profiles['Champion']['segment']);
        $this->assertSame('loyal', $profiles['Loyal']['segment']);
        $this->assertSame('new', $profiles['Newcomer']['segment']);
        $this->assertSame('at_risk', $profiles['At Risk']['segment']);
        $this->assertSame('lost', $profiles['Gone']['segment']);
    }

    public function test_summary_counts_and_lifetime_spend(): void
    {
        $a = $this->customer('A');
        $this->order($a, 1000, 3);
        foreach (range(1, 4) as $i) {
            $this->order($a, 1000, 3);
        }

        $b = $this->customer('B');
        $this->order($b, 200, 200);

        $summary = app(CustomerSegmentationService::class)->summary($this->tenant);

        $this->assertSame(2, $summary['total']);
        $this->assertSame(5200.0, $summary['spend']);

        $byKey = collect($summary['segments'])->keyBy('key');
        $this->assertSame(1, $byKey['champions']['count']);
        $this->assertSame(1, $byKey['lost']['count']);
    }

    public function test_customer_analytics_report_renders(): void
    {
        $c = $this->customer('Rowan');
        $this->order($c, 500, 1);

        $period = ReportPeriod::make(null, null, null, $this->tenant, $this->branch);
        $report = app(ReportService::class)->customers($period);

        $labels = collect($report['summary'])->pluck('label');
        $this->assertTrue($labels->contains('Customers'));
        $this->assertSame('Rowan', $report['rows'][0]['customer']);
        $this->assertSame('New', $report['rows'][0]['segment']);
    }

    public function test_segmentation_is_isolated_per_tenant(): void
    {
        $mine = $this->customer('Mine');
        $this->order($mine, 900, 1);

        $otherTenant = Tenant::factory()->create();
        $otherCustomer = Customer::withoutGlobalScopes()->create(['tenant_id' => $otherTenant->id, 'name' => 'Theirs']);

        $profiles = app(CustomerSegmentationService::class)->profiles($this->tenant);

        $this->assertSame(['Mine'], $profiles->pluck('name')->all());
        $this->assertNotContains('Theirs', $profiles->pluck('name')->all());
        $this->assertNotNull($otherCustomer);
    }

    public function test_profiles_include_real_visit_counts(): void
    {
        $customer = $this->customer('Visitor');
        $this->order($customer, 500, 1);
        $this->order($customer, 300, 1);

        foreach (range(1, 2) as $i) {
            DiningSession::factory()->create([
                'tenant_id' => $this->tenant->id,
                'branch_id' => $this->branch->id,
                'customer_id' => $customer->id,
            ]);
        }

        $profile = app(CustomerSegmentationService::class)->profiles($this->tenant)->firstWhere('customer_id', $customer->id);

        $this->assertSame(2, $profile['orders']);
        $this->assertSame(2, $profile['visits']);
    }

    public function test_customer_360_page_renders(): void
    {
        $customer = $this->customer('Rowan');
        $this->order($customer, 500, 1);

        $this->actingAs($this->owner)
            ->get('/customers/'.$customer->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Customers/Show')
                ->where('customer.name', 'Rowan')
                ->where('profile.segment', 'new')
                ->has('orders', 1));
    }

    public function test_segment_audience_can_be_exported_as_csv(): void
    {
        $customer = $this->customer('Rowan');
        $this->order($customer, 500, 1);

        $response = $this->actingAs($this->owner)->get('/customers/export?segment=new');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $this->assertStringContainsString('Rowan', $response->streamedContent());
    }

    public function test_customer_index_is_paginated_and_filtered_server_side(): void
    {
        foreach (range(1, 3) as $i) {
            $this->customer("Guest {$i}");
        }

        $this->actingAs($this->owner)
            ->get('/customers?search=Guest')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Customers/Index')
                ->has('customers.data', 3)
                ->where('metrics.total', 3));
    }
}
