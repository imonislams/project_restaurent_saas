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
 * Product image management through the product update form: keeping, replacing and
 * removing the saved image, plus validation and access control.
 */
class ProductImageTest extends TestCase
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
     * Minimal valid product payload for the update endpoint.
     *
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

    public function test_updating_other_fields_without_a_file_preserves_the_saved_image(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create([
            'tenant_id' => $owner->tenant_id,
            'image_path' => 'products/keep/dish.jpg',
        ]);
        Storage::disk('public')->put('products/keep/dish.jpg', 'keep');

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $product->id), $this->productPayload(['name' => 'Renamed Burger']))
            ->assertRedirect();

        $product->refresh();

        $this->assertSame('Renamed Burger', $product->name);
        $this->assertSame('products/keep/dish.jpg', $product->image_path);
        Storage::disk('public')->assertExists('products/keep/dish.jpg');
    }

    public function test_an_existing_image_can_be_replaced_through_the_update_form(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create([
            'tenant_id' => $owner->tenant_id,
            'image_path' => 'products/old/dish.jpg',
        ]);
        Storage::disk('public')->put('products/old/dish.jpg', 'old');

        // Mirrors the browser: a file-carrying update is POSTed with a spoofed PATCH,
        // because PHP never parses a multipart body for a real PATCH request.
        $this->actingAs($owner)
            ->post(route('menu.products.update', $product->id), $this->productPayload([
                '_method' => 'patch',
                'image' => UploadedFile::fake()->image('new.jpg'),
            ]))
            ->assertRedirect();

        $product->refresh();

        $this->assertNotSame('products/old/dish.jpg', $product->image_path);
        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertMissing('products/old/dish.jpg');
        Storage::disk('public')->assertExists($product->image_path);
    }

    public function test_a_saved_image_can_be_removed_through_the_update_form(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create([
            'tenant_id' => $owner->tenant_id,
            'image_path' => 'products/gone/dish.jpg',
        ]);
        Storage::disk('public')->put('products/gone/dish.jpg', 'gone');

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $product->id), $this->productPayload(['remove_image' => true]))
            ->assertRedirect();

        $product->refresh();

        $this->assertNull($product->image_path);
        Storage::disk('public')->assertMissing('products/gone/dish.jpg');
    }

    public function test_the_remove_image_flag_is_a_safe_no_op_when_no_image_is_saved(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create([
            'tenant_id' => $owner->tenant_id,
            'image_path' => null,
        ]);

        $this->actingAs($owner)
            ->patch(route('menu.products.update', $product->id), $this->productPayload(['remove_image' => true]))
            ->assertRedirect();

        $this->assertNull($product->fresh()->image_path);
    }

    public function test_a_product_image_must_be_a_supported_type(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id]);

        $this->actingAs($owner)
            ->post(route('menu.products.update', $product->id), $this->productPayload([
                '_method' => 'patch',
                'image' => UploadedFile::fake()->create('menu.pdf', 100, 'application/pdf'),
            ]))
            ->assertSessionHasErrors('image');

        $this->assertNull($product->fresh()->image_path);
    }

    public function test_a_product_image_must_not_exceed_the_size_limit(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id]);

        $this->actingAs($owner)
            ->post(route('menu.products.update', $product->id), $this->productPayload([
                '_method' => 'patch',
                'image' => UploadedFile::fake()->image('huge.jpg')->size(3000),
            ]))
            ->assertSessionHasErrors('image');

        $this->assertNull($product->fresh()->image_path);
    }

    public function test_a_user_without_menu_manage_cannot_change_a_product_image(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create([
            'tenant_id' => $owner->tenant_id,
            'image_path' => 'products/x/dish.jpg',
        ]);
        Storage::disk('public')->put('products/x/dish.jpg', 'x');

        $cashier = User::factory()->forTenant($owner->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)
            ->patch(route('menu.products.update', $product->id), $this->productPayload(['remove_image' => true]))
            ->assertForbidden();

        $this->actingAs($cashier)
            ->delete(route('menu.products.image.destroy', $product->id))
            ->assertForbidden();

        $this->assertSame('products/x/dish.jpg', $product->fresh()->image_path);
    }

    public function test_a_product_image_cannot_be_changed_across_tenants(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create([
            'tenant_id' => $owner->tenant_id,
            'image_path' => 'products/x/dish.jpg',
        ]);
        Storage::disk('public')->put('products/x/dish.jpg', 'x');

        $intruder = $this->owner();

        $this->actingAs($intruder)
            ->patch(route('menu.products.update', $product->id), $this->productPayload(['remove_image' => true]))
            ->assertNotFound();

        $this->actingAs($intruder)
            ->delete(route('menu.products.image.destroy', $product->id))
            ->assertNotFound();

        $this->assertSame('products/x/dish.jpg', $product->fresh()->image_path);
    }
}
