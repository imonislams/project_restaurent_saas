<?php

namespace Tests\Feature\Menu;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\Unit;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\Recipe;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductRecipeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    protected function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Burger',
            'price_dine_in' => 10, 'price_takeaway' => 10, 'price_delivery' => 12,
            'inventory_mode' => 'recipe',
        ], $overrides);
    }

    public function test_recipe_is_saved_and_replaced_from_the_product_form(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);
        $this->actingAs($owner);

        $unit = Unit::create(['tenant_id' => $tenant->id, 'name' => 'Gram', 'code' => 'g']);
        $beef = Ingredient::create(['tenant_id' => $tenant->id, 'unit_id' => $unit->id, 'name' => 'Beef', 'cost_per_unit' => 0.02, 'track_inventory' => true, 'is_active' => true]);
        $bun = Ingredient::create(['tenant_id' => $tenant->id, 'unit_id' => $unit->id, 'name' => 'Bun', 'cost_per_unit' => 0.5, 'track_inventory' => true, 'is_active' => true]);

        $this->post('/menu/products', $this->payload(['recipe' => [
            'yield_quantity' => 1,
            'items' => [
                ['ingredient_id' => $beef->id, 'quantity' => 150],
                ['ingredient_id' => $bun->id, 'quantity' => 1],
            ],
        ]]))->assertSessionHasNoErrors();

        $product = Product::where('name', 'Burger')->firstOrFail();
        $this->assertSame(2, Recipe::where('product_id', $product->id)->firstOrFail()->items()->count());

        $this->patch("/menu/products/{$product->id}", $this->payload(['recipe' => [
            'yield_quantity' => 1,
            'items' => [['ingredient_id' => $bun->id, 'quantity' => 2]],
        ]]))->assertSessionHasNoErrors();

        $this->assertSame(1, Recipe::where('product_id', $product->id)->count());
        $this->assertSame(1, Recipe::where('product_id', $product->id)->first()->items()->count());

        $this->get('/menu')->assertInertia(fn ($page) => $page
            ->has('ingredients', 2)
            ->where('products.data.0.recipe.items.0.ingredient_id', $bun->id));
    }

    public function test_recipe_mode_requires_at_least_one_ingredient(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)
            ->post('/menu/products', $this->payload(['recipe' => ['yield_quantity' => 1, 'items' => []]]))
            ->assertSessionHasErrors('recipe.items');
    }
}
