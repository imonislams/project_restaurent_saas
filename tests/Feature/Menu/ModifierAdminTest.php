<?php

namespace Tests\Feature\Menu;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModifierAdminTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    public function test_the_modifiers_page_renders_for_a_manager(): void
    {
        ModifierGroup::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Size']);

        $this->actingAs($this->user)
            ->get('/modifiers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Menu/Modifiers')
                ->has('groups', 1)
                ->where('groups.0.name', 'Size'));
    }

    public function test_a_group_can_be_created_with_options_and_products(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->user)->post('/modifiers/groups', [
            'name' => 'Cooking preference',
            'selection_type' => 'single',
            'min_select' => 1,
            'max_select' => 1,
            'is_required' => true,
            'is_active' => true,
            'products' => [$product->id],
            'options' => [
                ['name' => 'Rare', 'price_delta' => 0],
                ['name' => 'Well done', 'price_delta' => 0],
            ],
        ])->assertRedirect();

        $group = ModifierGroup::where('name', 'Cooking preference')->firstOrFail();

        $this->assertTrue($group->is_required);
        $this->assertCount(2, $group->options);
        $this->assertDatabaseHas('modifier_group_product', [
            'modifier_group_id' => $group->id,
            'product_id' => $product->id,
            'tenant_id' => $this->tenant->id,
        ]);
    }

    public function test_updating_a_group_replaces_its_options(): void
    {
        $group = ModifierGroup::factory()->create(['tenant_id' => $this->tenant->id]);
        ModifierOption::factory()->create(['tenant_id' => $this->tenant->id, 'modifier_group_id' => $group->id, 'name' => 'Old']);

        $this->actingAs($this->user)->patch("/modifiers/groups/{$group->id}", [
            'name' => 'Sides',
            'selection_type' => 'multiple',
            'max_select' => 3,
            'is_active' => true,
            'products' => [],
            'options' => [['name' => 'Fries', 'price_delta' => 3]],
        ])->assertRedirect();

        $this->assertSame('Sides', $group->fresh()->name);
        $this->assertSame(['Fries'], $group->options()->pluck('name')->all());
    }

    public function test_a_staff_member_without_permission_cannot_manage_modifiers(): void
    {
        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->post('/modifiers/groups', [
            'name' => 'Nope',
            'selection_type' => 'single',
        ])->assertForbidden();
    }

    public function test_a_cashier_can_view_modifiers_but_not_the_menu_admin(): void
    {
        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/modifiers')->assertOk();
    }
}
