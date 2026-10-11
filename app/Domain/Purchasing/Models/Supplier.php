<?php

namespace App\Domain\Purchasing\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'contact_name',
        'phone',
        'email',
        'address',
        'tax_id',
        'payment_terms_days',
        'notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'payment_terms_days' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    /** Total value of received purchase orders minus payments made. */
    public function outstandingBalance(): float
    {
        $invoiced = (float) $this->purchaseOrders()
            ->whereIn('status', ['approved', 'partially_received', 'received'])
            ->sum('total');
        $paid = (float) $this->payments()->sum('amount');

        return round($invoiced - $paid, 2);
    }
}
