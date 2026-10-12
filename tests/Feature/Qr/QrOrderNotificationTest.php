<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class QrOrderNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected Table $table;

    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        // Default policy: QR orders require staff approval.
        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;
    }

    protected function placeQrOrder(): Order
    {
        Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100, 'inventory_mode' => InventoryMode::None]);

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();

        $this->withHeader('X-Dining-Token', $start->json('session_token'))
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'notif-'.uniqid(),
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $start->json('participant_token')])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_a_qr_order_requires_approval_and_notifies_staff(): void
    {
        $order = $this->placeQrOrder();

        $this->assertSame('pending', $order->acceptance_status->value);
        $this->assertSame(0, DB::table('kitchen_tickets')->count());
        $this->assertSame(1, DB::table('notifications')->where('notifiable_id', $this->user->id)->count());
    }

    public function test_accepting_the_order_sends_it_to_the_kitchen(): void
    {
        $order = $this->placeQrOrder();
        $this->assertSame(0, DB::table('kitchen_tickets')->count());

        $this->actingAs($this->user)
            ->post("/orders/{$order->id}/accept")
            ->assertRedirect();

        $this->assertSame('accepted', $order->fresh()->acceptance_status->value);
        $this->assertSame(1, DB::table('kitchen_tickets')->count());
    }

    public function test_rejecting_the_order_never_reaches_the_kitchen(): void
    {
        $order = $this->placeQrOrder();

        $this->actingAs($this->user)
            ->post("/orders/{$order->id}/reject", ['reason' => 'Item unavailable'])
            ->assertRedirect();

        $this->assertSame('rejected', $order->fresh()->acceptance_status->value);
        $this->assertSame(0, DB::table('kitchen_tickets')->count());
    }

    public function test_auto_accept_sends_the_order_straight_to_the_kitchen(): void
    {
        $this->tenant->mergeSettings(['qr' => ['auto_accept' => true]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $order = $this->placeQrOrder();

        $this->assertSame('auto_accepted', $order->acceptance_status->value);
        $this->assertSame(1, DB::table('kitchen_tickets')->count());
        $this->assertSame(0, DB::table('notifications')->count());
    }

    public function test_pending_approvals_are_exposed_to_the_frontend(): void
    {
        $this->placeQrOrder();

        $this->actingAs($this->user)
            ->get('/orders')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('pending_approvals', 1));
    }
}
