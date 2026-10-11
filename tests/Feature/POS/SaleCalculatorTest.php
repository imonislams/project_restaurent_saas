<?php

namespace Tests\Feature\POS;

use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\POS\SaleCalculator;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SaleCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected function tenantWith(array $settings): Tenant
    {
        $tenant = Tenant::factory()->create();
        $tenant->mergeSettings($settings);
        $tenant->save();

        app(TenantContext::class)->set($tenant);

        return $tenant;
    }

    protected function product(Tenant $tenant, array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'tenant_id' => $tenant->id,
            'name' => 'Item',
            'price_dine_in' => 100,
            'price_takeaway' => 90,
            'price_delivery' => 110,
            'cost_price' => 40,
        ], $attributes));
    }

    public function test_line_totals_use_the_price_for_the_order_type(): void
    {
        $tenant = $this->tenantWith([]);
        $product = $this->product($tenant);

        $result = app(SaleCalculator::class)->calculate(
            [['product' => $product, 'variant' => null, 'quantity' => 2]],
            OrderType::Takeaway,
        );

        $this->assertSame(180.0, $result['subtotal']);
        $this->assertSame(180.0, $result['total']);
    }

    public function test_exclusive_tax_is_added_on_top(): void
    {
        $tenant = $this->tenantWith(['tax' => ['rate' => 15, 'inclusive' => false]]);
        $product = $this->product($tenant);

        $result = app(SaleCalculator::class)->calculate(
            [['product' => $product, 'variant' => null, 'quantity' => 2]],
            OrderType::DineIn,
        );

        $this->assertSame(200.0, $result['subtotal']);
        $this->assertSame(30.0, $result['tax_total']);
        $this->assertSame(230.0, $result['total']);
    }

    public function test_inclusive_tax_is_extracted_from_the_price(): void
    {
        $tenant = $this->tenantWith(['tax' => ['rate' => 15, 'inclusive' => true]]);
        $product = $this->product($tenant, ['price_dine_in' => 115]);

        $result = app(SaleCalculator::class)->calculate(
            [['product' => $product, 'variant' => null, 'quantity' => 1]],
            OrderType::DineIn,
        );

        $this->assertSame(115.0, $result['subtotal']);
        $this->assertSame(15.0, $result['tax_total']);
        $this->assertSame(115.0, $result['total']);
    }

    public function test_percentage_discount_reduces_the_taxable_base(): void
    {
        $tenant = $this->tenantWith(['tax' => ['rate' => 15, 'inclusive' => false]]);
        $product = $this->product($tenant);

        $result = app(SaleCalculator::class)->calculate(
            [['product' => $product, 'variant' => null, 'quantity' => 2]],
            OrderType::DineIn,
            ['discount_type' => 'percent', 'discount_value' => 10],
        );

        $this->assertSame(200.0, $result['subtotal']);
        $this->assertSame(20.0, $result['discount_total']);
        $this->assertSame(27.0, $result['tax_total']);
        $this->assertSame(207.0, $result['total']);
    }

    public function test_service_charge_is_applied_when_enabled(): void
    {
        $tenant = $this->tenantWith(['service_charge' => ['rate' => 10]]);
        $product = $this->product($tenant, ['price_dine_in' => 100]);

        $result = app(SaleCalculator::class)->calculate(
            [['product' => $product, 'variant' => null, 'quantity' => 1]],
            OrderType::DineIn,
            ['service_charge' => true],
        );

        $this->assertSame(10.0, $result['service_charge']);
        $this->assertSame(110.0, $result['total']);
    }

    public function test_empty_order_is_rejected(): void
    {
        $this->tenantWith([]);

        $this->expectException(ValidationException::class);

        app(SaleCalculator::class)->calculate([], OrderType::DineIn);
    }
}
