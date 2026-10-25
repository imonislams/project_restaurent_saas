<?php

namespace Tests\Feature\Menu;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Editing one product must not mutate other records: variant ids survive so past orders
 * keep their reference, and an image file still used by another product is never deleted.
 */
class ProductEditSafetyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(): User
    {
        $user = User::factory()->forTenant(Tenant::factory()->create())->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    protected function productPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Signature Burger',
            'price_dine_in' => 320,
            'price_takeaway' => 320,
            'price_delivery' => 340,
            'inventory_mode' => 'none',
        ], $overrides);
    }

    public function test_editing_a_product_keeps_its_variant_ids(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id]);

        $regular = $product->variants()->create([
            'tenant_id' => $owner->tenant_id, 'name' => 'Regular', 'price' => 300,
            'sort_order' => 0, 'is_default' => true,
        ]);
        $large = $product->variants()->create([
            'tenant_id' => $owner->tenant_id, 'name' => 'Large', 'price' => 400,
            'sort_order' => 1, 'is_default' => false,
        ]);

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $product->id), $this->productPayload([
                'name' => 'Renamed Burger',
                'variants' => [
                    ['id' => $regular->id, 'name' => 'Regular', 'sku' => null, 'price' => 310],
                    ['id' => $large->id, 'name' => 'Large', 'sku' => null, 'price' => 410],
                ],
            ]))
            ->assertRedirect();

        $this->assertSame('Renamed Burger', $product->fresh()->name);

        // Same rows — the ids past orders point at are untouched.
        $this->assertDatabaseHas('product_variants', ['id' => $regular->id, 'price' => 310]);
        $this->assertDatabaseHas('product_variants', ['id' => $large->id, 'price' => 410]);
        $this->assertSame(2, $product->variants()->count());
    }

    public function test_removing_a_variant_deletes_only_that_variant(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id]);

        $kept = $product->variants()->create([
            'tenant_id' => $owner->tenant_id, 'name' => 'Regular', 'price' => 300,
            'sort_order' => 0, 'is_default' => true,
        ]);
        $removed = $product->variants()->create([
            'tenant_id' => $owner->tenant_id, 'name' => 'Large', 'price' => 400,
            'sort_order' => 1, 'is_default' => false,
        ]);

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $product->id), $this->productPayload([
                'variants' => [
                    ['id' => $kept->id, 'name' => 'Regular', 'sku' => null, 'price' => 300],
                ],
            ]))
            ->assertRedirect();

        $this->assertDatabaseHas('product_variants', ['id' => $kept->id]);
        $this->assertSoftDeleted('product_variants', ['id' => $removed->id]);
    }

    public function test_replacing_an_image_keeps_a_file_another_product_still_uses(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $shared = 'products/'.$owner->tenant_id.'/shared.jpg';
        Storage::disk('public')->put($shared, 'img');

        $first = Product::factory()->create(['tenant_id' => $owner->tenant_id, 'image_path' => $shared]);
        $second = Product::factory()->create(['tenant_id' => $owner->tenant_id, 'image_path' => $shared]);

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $first->id), $this->productPayload([
                'image' => UploadedFile::fake()->image('new.jpg'),
            ]))
            ->assertRedirect();

        Storage::disk('public')->assertExists($shared);
        $this->assertSame($shared, $second->fresh()->image_path);
        $this->assertNotSame($shared, $first->fresh()->image_path);
    }

    public function test_removing_an_image_keeps_a_file_another_product_still_uses(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $shared = 'products/'.$owner->tenant_id.'/shared.jpg';
        Storage::disk('public')->put($shared, 'img');

        $first = Product::factory()->create(['tenant_id' => $owner->tenant_id, 'image_path' => $shared]);
        $second = Product::factory()->create(['tenant_id' => $owner->tenant_id, 'image_path' => $shared]);

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $first->id), $this->productPayload(['remove_image' => true]))
            ->assertRedirect();

        $this->assertNull($first->fresh()->image_path);
        Storage::disk('public')->assertExists($shared);
        $this->assertSame($shared, $second->fresh()->image_path);
    }

    public function test_removing_the_last_reference_deletes_the_file(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $only = 'products/'.$owner->tenant_id.'/only.jpg';
        Storage::disk('public')->put($only, 'img');

        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id, 'image_path' => $only]);

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $product->id), $this->productPayload(['remove_image' => true]))
            ->assertRedirect();

        Storage::disk('public')->assertMissing($only);
    }
}
