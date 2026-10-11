<?php

namespace App\Domain\Orders\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

/**
 * Per-branch monotonic counter backing branch-safe order numbers.
 */
class OrderSequence extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'branch_id', 'last_number'];

    protected function casts(): array
    {
        return ['last_number' => 'integer'];
    }
}
