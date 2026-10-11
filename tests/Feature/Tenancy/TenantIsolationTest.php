<?php

namespace Tests\Feature\Tenancy;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_global_scope_isolates_owned_records_by_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $branchA = Branch::factory()->create(['tenant_id' => $tenantA->getKey()]);
        $branchB = Branch::factory()->create(['tenant_id' => $tenantB->getKey()]);

        $context = app(TenantContext::class);

        $context->set($tenantA);
        $this->assertSame([$branchA->getKey()], Branch::query()->pluck('id')->all());

        $context->set($tenantB);
        $this->assertSame([$branchB->getKey()], Branch::query()->pluck('id')->all());

        $context->forget();
        $this->assertCount(2, Branch::query()->get());
    }

    public function test_scoped_lookup_does_not_leak_across_tenants(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $branchA = Branch::factory()->create(['tenant_id' => $tenantA->getKey()]);
        $branchB = Branch::factory()->create(['tenant_id' => $tenantB->getKey()]);

        app(TenantContext::class)->set($tenantA);

        $this->assertNotNull(Branch::query()->find($branchA->getKey()));
        $this->assertNull(Branch::query()->find($branchB->getKey()));
    }

    public function test_tenant_id_is_autofilled_from_context_on_create(): void
    {
        $tenant = Tenant::factory()->create();

        app(TenantContext::class)->set($tenant);

        $branch = Branch::create(['name' => 'Main Branch', 'code' => 'MAIN']);

        $this->assertSame($tenant->getKey(), $branch->tenant_id);
    }

    public function test_tenant_policy_denies_cross_tenant_access(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $user = User::factory()->forTenant($tenantA)->create();

        $this->assertTrue($user->can('view', $tenantA));
        $this->assertFalse($user->can('view', $tenantB));
    }

    public function test_active_tenant_users_can_access_the_dashboard(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->forTenant($tenant)->create();

        $this->actingAs($user)->get('/dashboard')->assertOk();
    }

    public function test_suspended_tenant_users_are_logged_out(): void
    {
        $tenant = Tenant::factory()->suspended()->create();
        $user = User::factory()->forTenant($tenant)->create();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_tenant_users_linked_to_a_missing_tenant_are_logged_out(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->forTenant($tenant)->create();

        $tenant->delete();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertRedirect(route('login'));
        $this->assertGuest();
    }
}
