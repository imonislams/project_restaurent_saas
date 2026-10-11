<?php

namespace App\Domain\BackupAndRecovery\Models;

use App\Domain\BackupAndRecovery\Enums\RestoreStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackupRestore extends Model
{
    protected $fillable = [
        'backup_id',
        'tenant_id',
        'scope',
        'reason',
        'status',
        'checkpoint_backup_id',
        'requested_by',
        'approved_by',
        'verification',
        'error',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => RestoreStatus::class,
            'verification' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function backup(): BelongsTo
    {
        return $this->belongsTo(Backup::class);
    }

    public function checkpoint(): BelongsTo
    {
        return $this->belongsTo(Backup::class, 'checkpoint_backup_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
