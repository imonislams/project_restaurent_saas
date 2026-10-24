<?php

namespace App\Domain\Dining\Models;

use App\Domain\Dining\Enums\BillRequestStatus;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillRequest extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'dining_session_id',
        'invoice_id',
        'requested_by_participant_id',
        'status',
        'payable_total',
        'requested_at',
        'handled_by',
        'handled_at',
        'settled_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'status' => BillRequestStatus::class,
            'payable_total' => 'decimal:2',
            'requested_at' => 'datetime',
            'handled_at' => 'datetime',
            'settled_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(DiningSession::class, 'dining_session_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(\App\Domain\Invoicing\Models\Invoice::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(DiningParticipant::class, 'requested_by_participant_id');
    }

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
