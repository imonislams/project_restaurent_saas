<?php

namespace Tests\Feature\Platform;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\POS\SaleService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceiptBrandingTest extends TestCase
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
        $this->tenant->mergeSettings([
            'tax' => ['rate' => 0, 'inclusive' => false],
            'company' => [
                'legal_name' => 'Acme Foods',
                'address' => '12 Main Street',
                'phone' => '555-0100',
                'email' => 'hello@acme.test',
            ],
        ]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->user, 0);
    }

    protected function placeOrder(): Order
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::None,
        ]);
        $cash = PaymentMethod::query()->where('code', 'cash')->firstOrFail();

        return app(SaleService::class)->place([
            'branch_id' => $this->branch->id,
            'order_type' => 'counter',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 100, 'tendered' => 100]],
        ], $this->user, $this->branch);
    }

    protected function platformAdmin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_the_receipt_branding_settings_group_is_available_to_the_platform_admin(): void
    {
        $this->actingAs($this->platformAdmin())
            ->get('/platform/settings/receipts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Settings/Show')
                ->where('group', 'receipts')
                ->has('schema.fields', 2));
    }

    public function test_the_platform_admin_can_toggle_receipt_branding(): void
    {
        $this->actingAs($this->platformAdmin())
            ->post('/platform/settings/receipts', [
                'values' => ['show_logo' => false, 'show_company_details' => true],
            ])
            ->assertRedirect();

        $this->assertSame(false, app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('receipts.show_logo'));
    }

    public function test_the_receipt_footer_contains_company_branding(): void
    {
        $order = $this->placeOrder();

        $this->actingAs($this->user)
            ->get(route('orders.receipt', $order))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Orders/Receipt')
                ->where('receipt.branding.show_logo', true)
                ->where('receipt.branding.show_details', true)
                ->where('receipt.branding.company_name', 'Acme Foods')
                ->where('receipt.branding.address', '12 Main Street')
                ->where('receipt.branding.phone', '555-0100')
                ->where('receipt.branding.email', 'hello@acme.test'));
    }

    public function test_the_platform_admin_can_hide_the_logo_on_all_receipts(): void
    {
        $this->actingAs($this->platformAdmin())->post('/platform/settings/receipts', [
            'values' => ['show_logo' => false, 'show_company_details' => true],
        ])->assertRedirect();

        $order = $this->placeOrder();

        $this->actingAs($this->user)
            ->get(route('orders.receipt', $order))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('receipt.branding.show_logo', false));
    }

    public function test_a_non_platform_user_cannot_reach_the_receipt_branding_settings(): void
    {
        $this->actingAs($this->user)->get('/platform/settings/receipts')->assertForbidden();
    }
}
