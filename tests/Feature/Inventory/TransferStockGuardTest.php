<?php

namespace Tests\Feature\Inventory;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\Models\StockTransfer;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A transfer must not ship more than the source branch holds — otherwise the
 * destination is credited with stock that never existed (phantom stock).
 */
class TransferStockGuardTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $from;

    protected Branch $to;

    protected User $owner;

    protected Ingredient $ingredient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->from = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'FROM']);
        $this->to = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'TO']);

        $defaults = app(ProvisionInventoryDefaults::class);
        $defaults->forTenant($this->tenant);
        $defaults->defaultLocationFor($this->from);
        $defaults->defaultLocationFor($this->to);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);

        $this->ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id, 'cost_per_unit' => 3]);
        app(StockService::class)->receiveOpening($this->ingredient, $defaults->defaultLocationFor($this->from), 50);
    }

    protected function fromLocation()
    {
        return app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->from);
    }

    protected function toLocation()
    {
        return app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->to);
    }

    protected function createTransfer(string $type, int $itemId, float $quantity): StockTransfer
    {
        $this->actingAs($this->owner)->post('/transfers', [
            'from_branch_id' => $this->from->id,
            'to_branch_id' => $this->to->id,
            'items' => [[
                'item_type' => $type,
                'item_id' => $itemId,
                'quantity' => $quantity,
            ]],
        ])->assertRedirect();

        return StockTransfer::latest('id')->firstOrFail();
    }

    public function test_dispatch_cannot_ship_more_than_the_source_holds(): void
    {
        $transfer = $this->createTransfer('ingredient', $this->ingredient->id, 80);
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/approve");

        $this->actingAs($this->owner)
            ->post("/transfers/{$transfer->id}/dispatch")
            ->assertSessionHasErrors('quantity');

        $stock = app(StockService::class);
        $this->assertSame(50.0, $stock->balanceFor($this->ingredient, $this->fromLocation()));
        $this->assertSame(0.0, $stock->balanceFor($this->ingredient, $this->toLocation()));
        $this->assertSame('approved', $transfer->fresh()->status->value);
        $this->assertSame(0, StockMovement::where('reason', 'transfer_out')->count());
    }

    public function test_a_product_stock_item_can_be_transferred(): void
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'inventory_mode' => InventoryMode::Product,
            'cost_price' => 2,
        ]);
        app(StockService::class)->receiveOpening($product, $this->fromLocation(), 10);

        $transfer = $this->createTransfer('product', $product->id, 4);
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/approve");
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/dispatch")->assertRedirect();
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/receive")->assertRedirect();

        $stock = app(StockService::class);
        $this->assertSame(6.0, $stock->balanceFor($product, $this->fromLocation()));
        $this->assertSame(4.0, $stock->balanceFor($product, $this->toLocation()));
        $this->assertSame('received', $transfer->fresh()->status->value);
    }
}
