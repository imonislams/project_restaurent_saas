<?php

namespace App\Domain\Security\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only security event (login, failed login, permission change, ...). */
class SecurityEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'event',
        'user_id',
        'email',
        'ip',
        'user_agent',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
