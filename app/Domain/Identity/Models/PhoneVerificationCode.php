<?php

namespace App\Domain\Identity\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

/**
 * A single one-time code issued to a phone number. The plaintext code is never
 * stored — only its hash — and it expires and is consumed once.
 */
class PhoneVerificationCode extends Model
{
    protected $fillable = [
        'user_id',
        'phone',
        'code_hash',
        'purpose',
        'attempts',
        'expires_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isConsumed(): bool
    {
        return $this->consumed_at !== null;
    }

    public function isActive(): bool
    {
        return ! $this->isConsumed() && ! $this->isExpired();
    }
}
