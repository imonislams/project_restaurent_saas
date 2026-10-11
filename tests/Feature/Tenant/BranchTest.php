<?php

namespace Tests\Feature\Tenant;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function payload(string $name = 'Downtown'): array
    {
        return [
            'name' => $name,
            'code' => strtoupper(substr($name, 0, 4)),
            'address' => '12 High Street',
            'phone' => '01700000000',
            'timezone' => 'Asia/Dhaka',
            'currency' => 'BDT',
            'service_types' => ['dine_in', 'takeaway'],
        ];
    }

    public function test_branches_page_renders_for_the_owner(): void
    {
        $this->actingAs($this->owner)->get('/branches')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Branches/Index')->has('branches'));
    }

    public function test_a_read_only_user_cannot_create_branches(): void
    {
        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/branches')->assertForbidden();
        $this->actingAs($cashier)->post('/branches', $this->payload())->assertForbidden();
    }

    public function test_creating_a_branch_provisions_location_and_cash_account(): void
    {
        $this->actingAs($this->owner)->post('/branches', $this->payload())->assertRedirect();

        $branch = Branch::where('name', 'Downtown')->firstOrFail();

        $this->assertTrue($branch->is_primary, 'the first branch becomes primary');
        $this->assertDatabaseHas('stock_locations', ['branch_id' => $branch->id]);
        $this->assertDatabaseHas('financial_accounts', ['branch_id' => $branch->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'branch.created']);
    }

    public function test_branch_creation_is_capped_by_the_plan_limit(): void
    {
        // Starter allows 1 branch.
        $starter = Plan::where('slug', 'starter')->firstOrFail();
        app(SubscriptionService::class)->startTrial($this->tenant, $starter);

        $this->actingAs($this->owner)->post('/branches', $this->payload('First'))->assertRedirect();
        $this->assertSame(1, $this->tenant->branches()->count());

        $this->actingAs($this->owner)->post('/branches', $this->payload('Second'))->assertSessionHasErrors('name');
        $this->assertSame(1, $this->tenant->branches()->count());
    }

    public function test_primary_branch_cannot_be_deactivated(): void
    {
        $this->actingAs($this->owner)->post('/branches', $this->payload())->assertRedirect();
        $branch = Branch::where('name', 'Downtown')->firstOrFail();

        $this->actingAs($this->owner)->post("/branches/{$branch->id}/deactivate")->assertSessionHasErrors('branch');
        $this->assertTrue($branch->fresh()->is_active);
    }

    public function test_primary_can_be_reassigned_and_the_old_one_deactivated(): void
    {
        $this->actingAs($this->owner)->post('/branches', $this->payload('First'))->assertRedirect();
        $first = Branch::where('name', 'First')->firstOrFail();

        // Growth allows 3 branches.
        $growth = Plan::where('slug', 'growth')->firstOrFail();
        app(SubscriptionService::class)->startTrial($this->tenant, $growth);

        $this->actingAs($this->owner)->post('/branches', $this->payload('Second'))->assertRedirect();
        $second = Branch::where('name', 'Second')->firstOrFail();

        $this->actingAs($this->owner)->post("/branches/{$second->id}/primary")->assertRedirect();
        $this->assertTrue($second->fresh()->is_primary);
        $this->assertFalse($first->fresh()->is_primary);

        $this->actingAs($this->owner)->post("/branches/{$first->id}/deactivate")->assertRedirect();
        $this->assertFalse($first->fresh()->is_active);
    }
}
