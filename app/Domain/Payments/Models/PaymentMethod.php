<?php

namespace App\Domain\Payments\Models;

use App\Domain\Payments\Enums\PaymentMethodType;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaymentMethod extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = ['tenant_id', 'name', 'code', 'type', 'is_active', 'sort_order'];

    protected function casts(): array
    {
        return [
            'type' => PaymentMethodType::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function isCash(): bool
    {
        return $this->type->isCash();
    }
}
