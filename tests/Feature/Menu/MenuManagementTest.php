<?php

namespace Tests\Feature\Menu;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(Tenant $tenant): User
    {
        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    protected function validProductPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Chicken Biryani',
            'price_dine_in' => 320,
            'price_takeaway' => 310,
            'price_delivery' => 340,
            'cost_price' => 140,
            'inventory_mode' => 'none',
            'is_active' => true,
            'is_available' => true,
            'labels' => ['popular'],
            'variants' => [
                ['name' => 'Regular', 'price' => 320],
                ['name' => 'Large', 'price' => 420],
            ],
        ], $overrides);
    }

    public function test_owner_can_view_the_menu_page(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)
            ->get('/menu')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Menu/Index')->has('products.data'));
    }

    public function test_cashier_cannot_view_the_menu_page(): void
    {
        $tenant = Tenant::factory()->create();
        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/menu')->assertForbidden();
    }

    public function test_category_can_be_created_updated_and_deleted(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)
            ->post('/menu/categories', ['name' => 'Main Course', 'sort_order' => 1])
            ->assertRedirect();

        $category = Category::firstOrFail();
        $this->assertSame('main-course', $category->slug);

        $this->actingAs($owner)
            ->patch("/menu/categories/{$category->id}", ['name' => 'Mains', 'is_active' => true])
            ->assertRedirect();

        $this->assertSame('Mains', $category->fresh()->name);

        $this->actingAs($owner)
            ->delete("/menu/categories/{$category->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('categories', ['id' => $category->id]);
    }

    public function test_product_can_be_created_with_pricing_variants_and_labels(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $category = Category::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)
            ->post('/menu/products', $this->validProductPayload(['category_id' => $category->id]))
            ->assertRedirect();

        $product = Product::firstOrFail();
        $this->assertSame('Chicken Biryani', $product->name);
        $this->assertSame('320.00', $product->price_dine_in);
        $this->assertSame(['popular'], $product->labels);
        $this->assertCount(2, $product->variants);
        $this->assertTrue($product->variants->first()->is_default);
    }

    public function test_sku_must_be_unique_within_a_tenant_but_not_across_tenants(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $ownerA = $this->owner($tenantA);
        $ownerB = $this->owner($tenantB);

        Product::factory()->create(['tenant_id' => $tenantA->id, 'sku' => 'DUP-1']);

        $this->actingAs($ownerA)
            ->post('/menu/products', $this->validProductPayload(['sku' => 'DUP-1']))
            ->assertSessionHasErrors('sku');

        // The same SKU is fine in another tenant.
        $this->actingAs($ownerB)
            ->post('/menu/products', $this->validProductPayload(['sku' => 'DUP-1']))
            ->assertSessionHasNoErrors();
    }

    public function test_product_can_be_updated(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $product = Product::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Old Name']);

        $this->actingAs($owner)
            ->patch("/menu/products/{$product->id}", $this->validProductPayload(['name' => 'New Name']))
            ->assertRedirect();

        $this->assertSame('New Name', $product->fresh()->name);
    }

    public function test_cannot_manage_a_product_from_another_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $ownerA = $this->owner($tenantA);
        $productB = Product::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($ownerA)
            ->patch("/menu/products/{$productB->id}", $this->validProductPayload())
            ->assertNotFound();
    }

    public function test_branch_availability_overrides_product_availability(): void
    {
        $tenant = Tenant::factory()->create();
        $branchA = Branch::factory()->create(['tenant_id' => $tenant->id]);
        $branchB = Branch::factory()->create(['tenant_id' => $tenant->id]);

        $product = Product::factory()->create(['tenant_id' => $tenant->id, 'is_available' => true]);
        $product->availability()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branchB->id,
            'is_available' => false,
        ]);
        $product->load('availability');

        $this->assertTrue($product->isAvailableIn($branchA->id));
        $this->assertFalse($product->isAvailableIn($branchB->id));
    }
}
