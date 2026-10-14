<?php

namespace Tests\Feature\Menu;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Menu\Models\Product;
use App\Domain\Operations\CommandRunner;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductBulkOpsTest extends TestCase
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

    public function test_a_product_image_can_be_uploaded_and_replaced(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id]);

        $this->actingAs($owner)
            ->post(route('menu.products.image', $product->id), ['image' => UploadedFile::fake()->image('dish.jpg')])
            ->assertRedirect();

        $product->refresh();
        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertExists($product->image_path);

        $first = $product->image_path;

        $this->actingAs($owner)
            ->post(route('menu.products.image', $product->id), ['image' => UploadedFile::fake()->image('dish2.jpg')])
            ->assertRedirect();

        $product->refresh();
        $this->assertNotSame($first, $product->image_path);
        Storage::disk('public')->assertMissing($first);
    }

    public function test_a_product_image_can_be_set_on_create(): void
    {
        Storage::fake('public');
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('menu.products.store'), [
                'name' => 'With Image',
                'price_dine_in' => 100,
                'price_takeaway' => 100,
                'price_delivery' => 120,
                'inventory_mode' => 'none',
                'image' => UploadedFile::fake()->image('dish.jpg'),
            ])
            ->assertRedirect();

        $product = Product::withoutGlobalScopes()
            ->where('tenant_id', $owner->tenant_id)
            ->where('name', 'With Image')
            ->firstOrFail();

        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertExists($product->image_path);
    }

    public function test_a_product_image_can_be_removed(): void
    {
        Storage::fake('public');
        $owner = $this->owner();
        $product = Product::factory()->create(['tenant_id' => $owner->tenant_id, 'image_path' => 'products/x/dish.jpg']);
        Storage::disk('public')->put('products/x/dish.jpg', 'x');

        $this->actingAs($owner)
            ->delete(route('menu.products.image.destroy', $product->id))
            ->assertRedirect();

        $this->assertNull($product->fresh()->image_path);
    }

    public function test_products_can_be_imported_from_csv(): void
    {
        $owner = $this->owner();

        $csv = "name,category,sku,price_dine_in,price_takeaway,price_delivery,cost_price,is_active\n"
            ."Chicken Biryani,Mains,BRY-1,320,320,340,120,1\n"
            ."Cola,Drinks,COL-1,40,40,45,15,1\n"
            .",Mains,,10,10,10,1,1\n"; // last row: missing name → skipped

        $this->actingAs($owner)
            ->post(route('menu.products.import'), ['file' => UploadedFile::fake()->createWithContent('products.csv', $csv)])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('products', ['tenant_id' => $owner->tenant_id, 'sku' => 'BRY-1', 'name' => 'Chicken Biryani']);
        $this->assertDatabaseHas('products', ['tenant_id' => $owner->tenant_id, 'sku' => 'COL-1']);
        $this->assertSame(2, Product::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->count());
        $this->assertDatabaseHas('categories', ['tenant_id' => $owner->tenant_id, 'name' => 'Mains']);
    }

    public function test_re_importing_updates_rather_than_duplicates(): void
    {
        $owner = $this->owner();

        $base = "name,category,sku,price_dine_in\n";
        $this->actingAs($owner)->post(route('menu.products.import'), [
            'file' => UploadedFile::fake()->createWithContent('a.csv', $base."Burger,Mains,BG-1,100\n"),
        ]);
        $this->actingAs($owner)->post(route('menu.products.import'), [
            'file' => UploadedFile::fake()->createWithContent('b.csv', $base."Burger,Mains,BG-1,150\n"),
        ]);

        $this->assertSame(1, Product::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->count());
        $this->assertSame(150.0, (float) Product::withoutGlobalScopes()->where('sku', 'BG-1')->first()->price_dine_in);
    }

    public function test_products_can_be_exported_as_csv(): void
    {
        $owner = $this->owner();
        Product::factory()->create(['tenant_id' => $owner->tenant_id, 'name' => 'Export Me', 'sku' => 'EXP-1']);

        $response = $this->actingAs($owner)->get(route('menu.products.export', ['format' => 'csv']));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
    }

    public function test_products_can_be_exported_as_pdf(): void
    {
        $owner = $this->owner();
        Product::factory()->create(['tenant_id' => $owner->tenant_id, 'name' => 'Export Me']);

        $response = $this->actingAs($owner)->get(route('menu.products.export', ['format' => 'pdf']));

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', (string) $response->headers->get('content-type'));
    }

    public function test_the_import_template_downloads(): void
    {
        $owner = $this->owner();

        $response = $this->actingAs($owner)->get(route('menu.products.template'));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
    }

    public function test_products_can_be_imported_with_images_from_urls(): void
    {
        Storage::fake('public');
        Http::fake(['*' => Http::response('binary-image-data', 200, ['Content-Type' => 'image/jpeg'])]);
        $owner = $this->owner();

        $csv = "name,category,sku,price_dine_in,image_url\n"
            ."Photo Burger,Mains,PB-1,150,https://cdn.example.com/burger.jpg\n";

        $this->actingAs($owner)
            ->post(route('menu.products.import'), ['file' => UploadedFile::fake()->createWithContent('p.csv', $csv)])
            ->assertRedirect();

        $product = Product::withoutGlobalScopes()->where('sku', 'PB-1')->firstOrFail();

        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertExists($product->image_path);
    }

    public function test_import_reports_an_image_that_cannot_be_downloaded(): void
    {
        Storage::fake('public');
        Http::fake(['*' => Http::response('nope', 404)]);
        $owner = $this->owner();

        $csv = "name,sku,price_dine_in,image_url\n"
            ."No Photo,NP-1,100,https://cdn.example.com/missing.jpg\n";

        $this->actingAs($owner)
            ->post(route('menu.products.import'), ['file' => UploadedFile::fake()->createWithContent('p.csv', $csv)])
            ->assertRedirect()
            ->assertSessionHas('import_result');

        // The product is still imported — just without the image.
        $product = Product::withoutGlobalScopes()->where('sku', 'NP-1')->firstOrFail();
        $this->assertNull($product->image_path);
    }

    public function test_the_storage_link_command_actually_runs(): void
    {
        $runner = app(CommandRunner::class);

        $command = $runner->curated()['storage_link']['command'];
        $this->assertStringContainsString('storage:link', $command);
        $this->assertStringContainsString('--force', $command);
        $this->assertStringContainsString('{php}', $command);

        $run = $runner->run($command, 'curated');

        $this->assertSame(0, $run->exit_code, $run->output);
        $this->assertFileExists(public_path('storage'));
    }
}
