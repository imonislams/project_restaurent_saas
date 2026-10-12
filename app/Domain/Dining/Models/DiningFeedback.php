<?php

namespace App\Domain\Dining\Models;

use App\Domain\Customers\Models\Customer;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiningFeedback extends Model
{
    use BelongsToTenant;

    public const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'dining_session_id',
        'customer_id',
        'rating',
        'comment',
        'consent_marketing',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'consent_marketing' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DiningSession::class, 'dining_session_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
