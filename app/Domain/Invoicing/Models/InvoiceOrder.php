<?php

namespace App\Domain\Invoicing\Models;

use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pivot linking an order to the invoice it is billed on. `order_id` is unique
 * at the database level, so an order can never be added to two invoices.
 */
class InvoiceOrder extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'order_id',
        'amount',
        'added_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'added_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
