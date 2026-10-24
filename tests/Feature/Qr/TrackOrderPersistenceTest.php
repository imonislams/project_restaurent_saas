<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The customer's "Track order" affordance must survive navigation back to the
 * menu and be dropped once the order is no longer eligible.
 */
class TrackOrderPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected Table $table;

    protected string $token;

    protected string $sessionToken;

    protected string $participant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->owner, 0);

        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $this->sessionToken = $start->json('session_token');
        $this->participant = $start->json('participant_token');
    }

    protected function placeOrder(): Order
    {
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::None,
        ]);

        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'track-'.uniqid(),
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $this->participant])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    protected function menuTracking(): \Illuminate\Testing\TestResponse
    {
        return $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->get("/qr/{$this->token}/menu")
            ->assertOk();
    }

    public function test_tracking_stays_available_after_returning_to_the_menu(): void
    {
        $this->placeOrder();

        // First render of the menu.
        $this->menuTracking()->assertInertia(fn ($page) => $page
            ->component('Qr/Menu')
            ->where('tracking.available', true)
            ->has('tracking.orders', 1));

        // Navigating back to the menu re-renders from server state — still available.
        $this->menuTracking()->assertInertia(fn ($page) => $page
            ->where('tracking.available', true)
            ->has('tracking.orders', 1));
    }

    public function test_tracking_disappears_once_the_order_is_no_longer_eligible(): void
    {
        $order = $this->placeOrder();
        $this->menuTracking()->assertInertia(fn ($page) => $page->where('tracking.available', true));

        // Rejecting voids the order but keeps the dining session open.
        $this->actingAs($this->owner)
            ->post("/orders/{$order->id}/reject", ['reason' => 'Item unavailable'])
            ->assertRedirect();

        $this->menuTracking()->assertInertia(fn ($page) => $page
            ->where('tracking.available', false)
            ->has('tracking.orders', 0));
    }
}
