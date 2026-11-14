<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrAdditionalItemsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Table $table;

    protected string $token;

    protected Product $burger;

    protected Product $pizza;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings([
            'tax' => ['rate' => 0, 'inclusive' => false],
            'orders.allow_additional_items' => true,
            'orders.send_confirmed_to_kitchen' => true,
        ]);
        $this->tenant->save();

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;

        $this->burger = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Burger',
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::None,
        ]);

        $this->pizza = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pizza',
            'price_dine_in' => 50,
            'inventory_mode' => InventoryMode::None,
        ]);
    }

    /** @return array{0: string, 1: string} */
    protected function startSession(bool $enableQr = true): array
    {
        $response = $this->postJson("/qr/{$this->token}/session", [])->assertOk();

        return [$response->json('session_token'), $response->json('participant_token')];
    }

    protected function place(string $sessionToken, string $participant, string $key, Product $product, float $quantity = 1)
    {
        return $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => $key,
                'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
            ], ['X-Dining-Participant' => $participant]);
    }

    public function test_a_repeat_qr_submission_merges_into_the_existing_order(): void
    {
        [$session, $participant] = $this->startSession();

        $this->place($session, $participant, 'qr-1', $this->burger, 2)
            ->assertCreated()
            ->assertJsonPath('merged', false);

        $this->place($session, $participant, 'qr-2', $this->pizza, 1)
            ->assertCreated()
            ->assertJsonPath('merged', true)
            ->assertJsonPath('round.number', 2);

        $this->assertSame(1, Order::count());

        $order = Order::firstOrFail();

        $this->assertSame(2, $order->rounds()->count());
        $this->assertSame(250.0, (float) $order->total);
        $this->assertSame(
            'pending',
            $order->rounds()->where('round_no', 2)->firstOrFail()->acceptance_status->value,
        );
    }

    public function test_without_the_setting_qr_keeps_creating_separate_orders(): void
    {
        [$session, $participant] = $this->startSession();

        $this->place($session, $participant, 'qr-off-1', $this->burger, 1)->assertCreated();

        $this->tenant->mergeSettings(['orders.allow_additional_items' => false]);
        $this->tenant->save();

        $this->place($session, $participant, 'qr-off-2', $this->pizza, 1)
            ->assertCreated()
            ->assertJsonPath('merged', false);

        $this->assertSame(2, Order::count());
    }

    public function test_an_auto_accepted_round_sends_only_its_own_items_to_the_kitchen(): void
    {
        $this->tenant->mergeSettings(['qr' => ['auto_accept' => true]]);
        $this->tenant->save();

        [$session, $participant] = $this->startSession();

        $this->place($session, $participant, 'qr-auto-1', $this->burger, 2)->assertCreated();
        $this->place($session, $participant, 'qr-auto-2', $this->pizza, 1)->assertCreated();

        $order = Order::firstOrFail();
        $tickets = KitchenTicket::orderBy('id')->get();

        $this->assertCount(2, $tickets);
        $this->assertSame('Burger', $tickets[0]->items()->first()->name);
        $this->assertSame('Pizza', $tickets[1]->items()->first()->name);
        $this->assertSame(1, $tickets[1]->items()->count());
        $this->assertSame(2, $order->items()->count());
        $this->assertSame(2, $order->rounds()->count());
    }

    public function test_individual_billing_does_not_merge_across_participants(): void
    {
        $this->tenant->mergeSettings(['qr' => ['billing_mode' => 'individual']]);
        $this->tenant->save();

        [$firstSession, $firstParticipant] = $this->startSession();
        [$secondSession, $secondParticipant] = $this->startSession();

        $this->assertSame(1, DiningSession::count());

        $this->place($firstSession, $firstParticipant, 'qr-ind-1', $this->burger, 1)->assertCreated();

        $this->place($secondSession, $secondParticipant, 'qr-ind-2', $this->pizza, 1)
            ->assertCreated()
            ->assertJsonPath('merged', false);

        $this->assertSame(2, Order::count());
    }

    public function test_a_settling_session_cannot_add_more_items(): void
    {
        [$session, $participant] = $this->startSession();

        $this->place($session, $participant, 'qr-settle-1', $this->burger, 1)->assertCreated();

        DiningSession::firstOrFail()->forceFill(['status' => 'settling'])->save();

        $this->place($session, $participant, 'qr-settle-2', $this->pizza, 1)
            ->assertStatus(422)
            ->assertJsonValidationErrors('session');

        $this->assertSame(1, Order::count());
    }

    public function test_the_qr_menu_exposes_the_merge_policy_and_active_order(): void
    {
        [$session, $participant] = $this->startSession();

        $this->place($session, $participant, 'qr-menu-1', $this->burger, 1)->assertCreated();

        $this->withHeader('X-Dining-Token', $session)
            ->withHeader('X-Dining-Participant', $participant)
            ->get("/qr/{$this->token}/menu")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Qr/Menu')
                ->where('policy.allow_additional_items', true)
                ->where('active_order.number', Order::firstOrFail()->order_number));
    }
}
