<?php

namespace App\Domain\Dining\Models;

use App\Domain\Customers\Models\Customer;
use App\Domain\Dining\Factories\DiningParticipantFactory;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiningParticipant extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'dining_session_id',
        'customer_id',
        'display_name',
        'phone',
        'email',
        'participant_token',
        'is_lead',
        'marketing_consent',
        'loyalty_consent',
        'is_active',
        'joined_at',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'is_lead' => 'boolean',
            'marketing_consent' => 'boolean',
            'loyalty_consent' => 'boolean',
            'is_active' => 'boolean',
            'joined_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    protected static function newFactory(): DiningParticipantFactory
    {
        return DiningParticipantFactory::new();
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DiningSession::class, 'dining_session_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'dining_participant_id');
    }
}
