<?php

namespace App\Domain\Monitoring\Models;

use Illuminate\Database\Eloquent\Model;

class ApplicationLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'level',
        'message',
        'context',
        'channel',
        'request_id',
        'tenant_id',
        'user_id',
        'logged_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'logged_at' => 'datetime',
        ];
    }
}
