<?php

namespace App\Domain\Tables\Factories;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TableQrToken>
 */
class TableQrTokenFactory extends Factory
{
    protected $model = TableQrToken::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'branch_id' => Branch::factory(),
            'table_id' => Table::factory(),
            'token' => Str::random(64),
            'is_active' => true,
            'revoked_at' => null,
            'created_by' => null,
            'scan_count' => 0,
            'last_scanned_at' => null,
        ];
    }

    public function revoked(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
            'revoked_at' => now(),
        ]);
    }
}
