<?php

namespace Tests\Feature\Menu;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Enums\ModifierSelectionType;
use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModifierOrderTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        // The dine-in table requirement has its own test; these tests cover other behaviour.
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false], 'pos.require_table_for_dine_in' => false]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->user, 0);
    }

    protected function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pizza',
            'price_dine_in' => 100,
            'price_takeaway' => 100,
            'price_delivery' => 100,
            'cost_price' => 40,
            'inventory_mode' => InventoryMode::None,
        ], $attributes));
    }

    protected function group(Product $product, array $groupAttributes = [], array $options = []): ModifierGroup
    {
        $group = ModifierGroup::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
        ], $groupAttributes));

        $product->modifierGroups()->attach($group->id, ['sort_order' => 0]);

        foreach ($options as $option) {
            ModifierOption::factory()->create(array_merge([
                'tenant_id' => $this->tenant->id,
                'modifier_group_id' => $group->id,
            ], $option));
        }

        return $group;
    }

    protected function cashMethod(): PaymentMethod
    {
        return PaymentMethod::query()->where('code', 'cash')->firstOrFail();
    }

    protected function place(array $items, float $amount)
    {
        return $this->actingAs($this->user)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => $items,
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => $amount, 'tendered' => $amount]],
        ]);
    }

    public function test_modifier_price_delta_is_applied_to_the_server_total(): void
    {
        $product = $this->product();
        $group = $this->group($product, ['name' => 'Size'], [
            ['name' => 'Large', 'price_delta' => 25],
        ]);
        $option = $group->options()->firstOrFail();

        $this->place([
            ['product_id' => $product->id, 'quantity' => 2, 'modifiers' => [['option_id' => $option->id]]],
        ], 250)->assertRedirect();

        $order = Order::with('items.modifiers')->firstOrFail();
        $this->assertSame(250.0, (float) $order->total);

        $item = $order->items->first();
        $this->assertSame(125.0, (float) $item->unit_price);
        $this->assertSame(50.0, (float) $item->modifiers_total);
        $this->assertCount(1, $item->modifiers);
        $this->assertSame('Large', $item->modifiers->first()->name);
    }

    public function test_required_modifier_group_must_be_selected(): void
    {
        $product = $this->product();
        $this->group($product, ['name' => 'Size', 'is_required' => true], [
            ['name' => 'Large', 'price_delta' => 25],
        ]);

        $this->place([
            ['product_id' => $product->id, 'quantity' => 1],
        ], 100)->assertSessionHasErrors('items');

        $this->assertSame(0, Order::count());
    }

    public function test_selecting_beyond_the_group_maximum_is_rejected(): void
    {
        $product = $this->product();
        $group = $this->group($product, [
            'name' => 'Toppings',
            'selection_type' => ModifierSelectionType::Multiple,
            'max_select' => 1,
        ], [
            ['name' => 'Cheese', 'price_delta' => 10],
            ['name' => 'Olives', 'price_delta' => 5],
        ]);
        $options = $group->options()->get();

        $this->place([
            ['product_id' => $product->id, 'quantity' => 1, 'modifiers' => [
                ['option_id' => $options[0]->id],
                ['option_id' => $options[1]->id],
            ]],
        ], 115)->assertSessionHasErrors('items');
    }

    public function test_a_modifier_not_belonging_to_the_product_is_rejected(): void
    {
        $product = $this->product();
        $other = $this->product(['name' => 'Burger']);
        $group = $this->group($other, ['name' => 'Size'], [['name' => 'Large', 'price_delta' => 25]]);
        $option = $group->options()->firstOrFail();

        $this->place([
            ['product_id' => $product->id, 'quantity' => 1, 'modifiers' => [['option_id' => $option->id]]],
        ], 100)->assertSessionHasErrors('items');
    }

    public function test_modifiers_are_snapshotted_into_the_kitchen_ticket(): void
    {
        $product = $this->product();
        $group = $this->group($product, ['name' => 'Size'], [['name' => 'Large', 'price_delta' => 25]]);
        $option = $group->options()->firstOrFail();

        $this->place([
            ['product_id' => $product->id, 'quantity' => 1, 'modifiers' => [['option_id' => $option->id]]],
        ], 125)->assertRedirect();

        $order = Order::firstOrFail();
        $ticket = app(KitchenService::class)->openTicketFor($order);

        $this->assertNotNull($ticket);
        $this->assertSame('Large', $ticket->items->first()->modifiers[0]['name']);
    }
}
