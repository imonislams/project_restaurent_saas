<?php

namespace Tests\Feature\Notifications;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Models\Product;
use App\Domain\Notifications\Notifications\SalesSummaryNotification;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Jobs\OpenKitchenTicket;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

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

        app(TenantContext::class)->set($this->tenant);
    }

    public function test_low_stock_command_notifies_owners(): void
    {
        $ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Rice']);
        app(StockService::class)->receiveOpening($ingredient, app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch), 0);

        $this->artisan('alerts:low-stock')->assertSuccessful();

        $this->assertSame(1, $this->owner->notifications()->count());
        $notification = $this->owner->notifications()->first();
        $this->assertSame('Low stock alert', $notification->data['title']);
    }

    public function test_shift_variance_notifies_owners_on_close(): void
    {
        $shift = app(ShiftService::class)->open($this->branch, $this->owner, 100);

        app(ShiftService::class)->close($shift, $this->owner, 90);

        $this->assertSame(1, $this->owner->notifications()->count());
        $this->assertSame('Cash discrepancy on shift close', $this->owner->notifications()->first()->data['title']);
    }

    public function test_daily_sales_command_notifies_owners_after_a_sale(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        app(ShiftService::class)->open($this->branch, $this->owner, 0);
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 200, 'tendered' => 200]],
        ])->assertRedirect();

        $this->artisan('notifications:daily-sales')->assertSuccessful();

        $this->assertSame(1, $this->owner->notifications()->count());
        $this->assertSame('Daily sales summary', $this->owner->notifications()->first()->data['title']);
    }

    public function test_a_sale_dispatches_the_kitchen_ticket_job(): void
    {
        Queue::fake();

        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        app(ShiftService::class)->open($this->branch, $this->owner, 0);
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertRedirect();

        Queue::assertPushed(OpenKitchenTicket::class);
    }

    public function test_the_inbox_lists_notifications_and_can_mark_them_read(): void
    {
        $this->owner->notify(new SalesSummaryNotification(
            $this->tenant->name, now()->toDateString(), 3, 150.0, 'USD',
        ));

        $this->actingAs($this->owner)
            ->get('/notifications')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Notifications/Index')->where('unread', 1));

        $notification = $this->owner->notifications()->first();

        $this->actingAs($this->owner)->post("/notifications/{$notification->id}/read")->assertRedirect();
        $this->assertSame(0, $this->owner->unreadNotifications()->count());

        // Mark-all endpoint.
        $this->owner->notify(new SalesSummaryNotification(
            $this->tenant->name, now()->toDateString(), 1, 10.0, 'USD',
        ));
        $this->actingAs($this->owner)->post('/notifications/read-all')->assertRedirect();
        $this->assertSame(0, $this->owner->unreadNotifications()->count());
    }

    public function test_unread_count_is_shared_with_the_frontend(): void
    {
        $this->owner->notify(new SalesSummaryNotification(
            $this->tenant->name, now()->toDateString(), 1, 10.0, 'USD',
        ));

        $this->actingAs($this->owner)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('notifications.unread', 1));
    }
}
