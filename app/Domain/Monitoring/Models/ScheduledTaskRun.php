<?php

namespace App\Domain\Monitoring\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduledTaskRun extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'task',
        'ran_at',
        'duration_ms',
        'exit_code',
        'output',
    ];

    protected function casts(): array
    {
        return [
            'ran_at' => 'datetime',
            'duration_ms' => 'integer',
            'exit_code' => 'integer',
        ];
    }
}
