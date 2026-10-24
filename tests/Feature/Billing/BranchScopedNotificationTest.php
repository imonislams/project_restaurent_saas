<?php

namespace Tests\Feature\Billing;

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
use Tests\TestCase;

/**
 * Order/billing notifications must only reach users who can access the branch
 * the event belongs to.
 */
class BranchScopedNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branchA;

    protected Branch $branchB;

    protected User $managerA;

    protected User $managerB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);

        $this->branchA = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'A']);
        $this->branchB = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'B']);

        $this->managerA = User::factory()->forTenant($this->tenant)->create();
        $this->managerA->assignRole(RoleName::BranchManager);
        $this->managerA->syncBranchAccess([$this->branchA->id]);

        $this->managerB = User::factory()->forTenant($this->tenant)->create();
        $this->managerB->assignRole(RoleName::BranchManager);
        $this->managerB->syncBranchAccess([$this->branchB->id]);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function placeQrOrderAt(Branch $branch): Order
    {
        $table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $branch->id,
            'name' => 'T-'.$branch->code,
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::None,
        ]);

        $token = app(TableQrService::class)->ensureToken($table)->token;

        $start = $this->postJson("/qr/{$token}/session", [])->assertOk();

        $this->withHeader('X-Dining-Token', $start->json('session_token'))
            ->postJson("/qr/{$token}/orders", [
                'idempotency_key' => 'bs-'.uniqid(),
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $start->json('participant_token')])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_a_pending_order_notifies_only_the_branch_approvers(): void
    {
        $this->placeQrOrderAt($this->branchB);

        $this->assertSame(0, $this->managerA->notifications()->count());
        $this->assertSame(1, $this->managerB->notifications()->count());
        $this->assertSame('New QR order — approval needed', $this->managerB->notifications()->first()->data['title']);
    }

    public function test_a_bill_request_notifies_only_the_branch_billing_staff(): void
    {
        $order = $this->placeQrOrderAt($this->branchB);
        $table = $order->table;

        $token = app(TableQrService::class)->ensureToken($table)->token;

        $start = $this->postJson("/qr/{$token}/session", [])->assertOk();

        $this->withHeader('X-Dining-Token', $start->json('session_token'))
            ->postJson("/qr/{$token}/bill-request", [], ['X-Dining-Participant' => $start->json('participant_token')])
            ->assertOk();

        $titlesB = $this->managerB->notifications()->get()->pluck('data.title')->all();
        $titlesA = $this->managerA->notifications()->get()->pluck('data.title')->all();

        $this->assertContains('Bill requested', $titlesB);
        $this->assertSame([], $titlesA);
    }
}
