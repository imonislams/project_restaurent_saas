<?php

namespace App\Domain\Menu\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Pivot between a product and a modifier group. Uses the tenant trait so the
 * pivot's tenant_id is filled automatically on attach.
 */
class ModifierGroupProduct extends Pivot
{
    use BelongsToTenant;

    protected $table = 'modifier_group_product';

    public $incrementing = true;

    protected $fillable = [
        'tenant_id',
        'modifier_group_id',
        'product_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }
}
