<?php

namespace App\Domain\BackupAndRecovery\Models;

use App\Domain\BackupAndRecovery\Enums\BackupScope;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    protected $fillable = [
        'scope',
        'tenant_id',
        'path',
        'disk',
        'bytes',
        'checksum',
        'encrypted',
        'status',
        'tables_count',
        'rows_count',
        'verified_at',
        'verification_result',
        'verification_notes',
        'expires_at',
        'created_by',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'scope' => BackupScope::class,
            'bytes' => 'integer',
            'encrypted' => 'boolean',
            'tables_count' => 'integer',
            'rows_count' => 'integer',
            'verified_at' => 'datetime',
            'expires_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isTenantScoped(): bool
    {
        return $this->scope === BackupScope::Tenant;
    }

    public function humanSize(): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $value = $this->bytes;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            $unit++;
        }

        return round($value, $unit === 0 ? 0 : 1).' '.$units[$unit];
    }
}
