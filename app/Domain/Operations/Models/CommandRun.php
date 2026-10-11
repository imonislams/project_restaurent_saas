<?php

namespace App\Domain\Operations\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommandRun extends Model
{
    protected $fillable = [
        'command',
        'type',
        'exit_code',
        'output',
        'duration_ms',
        'status',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'exit_code' => 'integer',
            'duration_ms' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
