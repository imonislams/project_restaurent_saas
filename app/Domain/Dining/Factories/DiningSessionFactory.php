<?php

namespace App\Domain\Dining\Factories;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Enums\BillingMode;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DiningSession>
 */
class DiningSessionFactory extends Factory
{
    protected $model = DiningSession::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'branch_id' => Branch::factory(),
            'table_id' => Table::factory(),
            'customer_id' => null,
            'session_token' => Str::random(64),
            'status' => DiningSessionStatus::Open,
            'billing_mode' => BillingMode::Consolidated,
            'guest_label' => null,
            'started_at' => now(),
            'last_activity_at' => now(),
            'expires_at' => now()->addHours(3),
            'closed_at' => null,
            'closed_by' => null,
            'close_reason' => null,
            'settled_at' => null,
            'meta' => null,
        ];
    }

    public function closed(): static
    {
        return $this->state(fn () => [
            'status' => DiningSessionStatus::Closed,
            'closed_at' => now(),
            'close_reason' => 'settled',
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'status' => DiningSessionStatus::Expired,
            'expires_at' => now()->subMinute(),
        ]);
    }
}
