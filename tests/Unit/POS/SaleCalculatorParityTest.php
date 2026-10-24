<?php

namespace Tests\Unit\POS;

use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\POS\SaleCalculator;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Order totals have one specification: tests/Fixtures/pricing/fixtures.json.
 *
 * This test asserts the server implementation against it. The TypeScript port the
 * offline POS uses is asserted against the *same* file by
 * resources/js/offline/pricing.test.ts. If the two implementations ever disagree
 * about money, one of these two tests fails.
 */
class SaleCalculatorParityTest extends TestCase
{
    use RefreshDatabase;

    public const FIXTURES = 'tests/Fixtures/pricing/fixtures.json';

    /**
     * Resolved from the file itself: a data provider runs before the application
     * is booted, so helpers such as base_path() are not available here.
     *
     * @return iterable<string, array{0: array<string, mixed>}>
     */
    public static function fixtures(): iterable
    {
        $path = dirname(__DIR__, 2).'/Fixtures/pricing/fixtures.json';

        $fixtures = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        foreach ($fixtures as $fixture) {
            yield $fixture['name'] => [$fixture];
        }
    }

    #[DataProvider('fixtures')]
    public function test_the_calculator_matches_the_pricing_fixture(array $fixture): void
    {
        $tenant = Tenant::factory()->create();
        $tenant->mergeSettings($fixture['tenant']);
        $tenant->save();

        app(TenantContext::class)->set($tenant);

        $lines = array_map(fn (array $line) => [
            'product' => $this->product($line),
            'variant' => null,
            'quantity' => $line['quantity'],
            'discount_amount' => $line['discount'] ?? 0,
            'notes' => null,
            'modifiers' => $line['modifiers'] ?? [],
        ], $fixture['lines']);

        $result = app(SaleCalculator::class)->calculate(
            $lines,
            OrderType::from($fixture['orderType']),
            $fixture['options'],
        );

        foreach ($fixture['expected'] as $key => $value) {
            if ($key === 'items') {
                continue;
            }

            $this->assertEqualsWithDelta(
                $value,
                $result[$key],
                0.0001,
                "[{$fixture['name']}] {$key}",
            );
        }

        foreach ($fixture['expected']['items'] ?? [] as $index => $expected) {
            foreach ($expected as $key => $value) {
                $this->assertEqualsWithDelta(
                    $value,
                    $result['items'][$index][$key],
                    0.0001,
                    "[{$fixture['name']}] items.{$index}.{$key}",
                );
            }
        }
    }

    /** @param array<string, mixed> $line */
    protected function product(array $line): Product
    {
        return Product::factory()->make([
            'name' => 'Fixture item',
            'sku' => 'FIX-001',
            'price_dine_in' => $line['prices']['dine_in'],
            'price_takeaway' => $line['prices']['takeaway'],
            'price_delivery' => $line['prices']['delivery'],
            'cost_price' => $line['cost'],
        ]);
    }
}
