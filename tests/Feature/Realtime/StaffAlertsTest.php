<?php

namespace Tests\Feature\Realtime;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Realtime\Events\KitchenTicketActivity;
use App\Domain\Realtime\Events\OrderActivity;
use App\Domain\Realtime\Events\OrderAwaitingApproval;
use App\Domain\Realtime\RealtimeManager;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class StaffAlertsTest extends TestCase
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

    protected function enableRealtime(): void
    {
        $realtime = app(RealtimeManager::class);
        $realtime->setDriver('pusher');
        $realtime->setCredentials('pusher', [
            'app_id' => '1874302',
            'key' => 'public-key',
            'secret' => 'supersecret',
            'cluster' => 'ap2',
        ]);
    }

    protected function placeQrOrder(): Order
    {
        Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100, 'inventory_mode' => InventoryMode::None]);

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();

        $this->withHeader('X-Dining-Token', $start->json('session_token'))
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'rt-'.uniqid(),
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $start->json('participant_token')])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_a_qr_order_awaiting_approval_is_pushed_to_the_approvals_channel(): void
    {
        $this->enableRealtime();
        Event::fake([OrderAwaitingApproval::class]);

        $order = $this->placeQrOrder();

        Event::assertDispatched(OrderAwaitingApproval::class, function (OrderAwaitingApproval $event) use ($order) {
            return $event->order->getKey() === $order->getKey()
                && str_contains((string) $event->broadcastOn()[0], 'tenant.'.$this->tenant->getKey().'.approvals')
                && $event->broadcastAs() === 'order.awaiting_approval'
                && $event->broadcastWith()['branch_id'] === $this->branch->getKey()
                && $event->broadcastWith()['order_number'] === $order->order_number;
        });
    }

    public function test_nothing_is_pushed_while_realtime_is_off(): void
    {
        Event::fake([OrderAwaitingApproval::class, KitchenTicketActivity::class]);

        $this->placeQrOrder();

        Event::assertNotDispatched(OrderAwaitingApproval::class);
        Event::assertNotDispatched(KitchenTicketActivity::class);
    }

    public function test_the_staff_stream_can_be_silenced(): void
    {
        $this->enableRealtime();
        app(RealtimeManager::class)->setStream('staff', false);

        Event::fake([OrderAwaitingApproval::class]);

        $this->placeQrOrder();

        Event::assertNotDispatched(OrderAwaitingApproval::class);
    }

    public function test_accepting_an_order_pushes_the_order_and_the_kitchen_ticket(): void
    {
        $this->enableRealtime();
        $order = $this->placeQrOrder();

        Event::fake([OrderActivity::class, KitchenTicketActivity::class]);

        $this->actingAs($this->user)->post("/orders/{$order->id}/accept")->assertRedirect();

        Event::assertDispatched(OrderActivity::class, fn (OrderActivity $event) => $event->action === 'accepted'
            && str_contains((string) $event->broadcastOn()[0], 'tenant.'.$this->tenant->getKey().'.orders'));

        Event::assertDispatched(KitchenTicketActivity::class, fn (KitchenTicketActivity $event) => $event->status === KitchenTicketStatus::New->value
            && $event->broadcastWith()['order_number'] === $order->order_number);
    }

    public function test_an_auto_accepted_order_pushes_a_kitchen_ticket_without_any_notification(): void
    {
        $this->tenant->mergeSettings(['qr' => ['auto_accept' => true]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->enableRealtime();
        Event::fake([KitchenTicketActivity::class, OrderAwaitingApproval::class]);

        $this->placeQrOrder();

        $this->assertSame(0, DB::table('notifications')->count());
        Event::assertDispatched(KitchenTicketActivity::class);
        Event::assertNotDispatched(OrderAwaitingApproval::class);
    }

    public function test_a_kitchen_status_change_is_pushed_with_its_new_status(): void
    {
        $this->enableRealtime();
        $order = $this->placeQrOrder();

        $this->actingAs($this->user)->post("/orders/{$order->id}/accept")->assertRedirect();

        $ticket = KitchenTicket::query()->where('order_id', $order->getKey())->firstOrFail();

        Event::fake([KitchenTicketActivity::class]);

        app(KitchenService::class)->setTicketStatus($ticket, KitchenTicketStatus::Preparing);

        Event::assertDispatched(KitchenTicketActivity::class, function (KitchenTicketActivity $event) use ($ticket) {
            $channels = array_map('strval', $event->broadcastOn());

            return $event->ticket->getKey() === $ticket->getKey()
                && $event->status === KitchenTicketStatus::Preparing->value
                && collect($channels)->contains(fn (string $channel) => str_contains($channel, 'tenant.'.$this->tenant->getKey().'.kitchen'))
                && collect($channels)->contains(fn (string $channel) => str_contains($channel, 'tenant.'.$this->tenant->getKey().'.orders'));
        });
    }

    public function test_rejecting_a_pending_order_is_pushed(): void
    {
        $this->enableRealtime();
        $order = $this->placeQrOrder();

        Event::fake([OrderActivity::class]);

        $this->actingAs($this->user)->post("/orders/{$order->id}/reject", ['reason' => 'Sold out'])->assertRedirect();

        Event::assertDispatched(OrderActivity::class, fn (OrderActivity $event) => $event->action === 'rejected'
            && $event->order->getKey() === $order->getKey());
    }
}
