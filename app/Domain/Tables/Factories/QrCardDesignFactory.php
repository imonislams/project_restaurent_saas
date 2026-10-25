<?php

namespace App\Domain\Tables\Factories;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Models\QrCardDesign;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QrCardDesign>
 */
class QrCardDesignFactory extends Factory
{
    protected $model = QrCardDesign::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'branch_id' => Branch::factory(),
            'name' => 'Table tent',
            'canvas' => [
                'width_mm' => 100,
                'height_mm' => 150,
                'background' => '#ffffff',
                'elements' => [],
            ],
            'is_active' => false,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['is_active' => true]);
    }

    public function companyWide(): static
    {
        return $this->state(fn () => ['branch_id' => null]);
    }
}
