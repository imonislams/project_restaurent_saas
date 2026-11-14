<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Communications\Models\Campaign;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A saved audience. Dynamic segments are evaluated from their rule set; static
 * segments are explicit lists. Member counts are cached and refreshed on evaluation.
 */
class MarketingSegment extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'type',
        'rules',
        'member_count',
        'last_evaluated_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'rules' => 'array',
            'member_count' => 'integer',
            'last_evaluated_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'segment_id');
    }

    public function isDynamic(): bool
    {
        return $this->type === 'dynamic';
    }
}
