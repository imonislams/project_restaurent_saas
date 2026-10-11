<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class UsageRecord extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'metric', 'value', 'period_start', 'period_end', 'recorded_at'];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:3',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'recorded_at' => 'datetime',
        ];
    }
}
