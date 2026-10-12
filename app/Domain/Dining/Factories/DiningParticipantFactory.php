<?php

namespace App\Domain\Dining\Factories;

use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DiningParticipant>
 */
class DiningParticipantFactory extends Factory
{
    protected $model = DiningParticipant::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'dining_session_id' => DiningSession::factory(),
            'customer_id' => null,
            'display_name' => null,
            'phone' => null,
            'email' => null,
            'participant_token' => Str::random(64),
            'is_lead' => false,
            'marketing_consent' => false,
            'loyalty_consent' => false,
            'is_active' => true,
            'joined_at' => now(),
            'last_seen_at' => now(),
        ];
    }

    public function lead(): static
    {
        return $this->state(fn () => ['is_lead' => true]);
    }
}
