<?php

namespace App\Domain\Customers\Models;

use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = ['tenant_id', 'name', 'phone', 'email', 'notes', 'tags', 'is_active', 'is_marketing_opt_in'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_marketing_opt_in' => 'boolean',
            'tags' => 'array',
        ];
    }

    public function loyaltyAccount(): HasOne
    {
        return $this->hasOne(LoyaltyAccount::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
