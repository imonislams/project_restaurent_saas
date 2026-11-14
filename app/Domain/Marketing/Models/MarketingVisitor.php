<?php

namespace App\Domain\Marketing\Models;

use App\Domain\Marketing\Enums\DeviceCategory;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An anonymous first-party visitor, identified by the md_vid cookie. First-touch and
 * last-touch context both live here so attribution never needs a second lookup.
 */
class MarketingVisitor extends Model
{
    protected $fillable = [
        'visitor_id',
        'first_seen_at',
        'last_seen_at',
        'first_path',
        'last_path',
        'first_referrer',
        'last_referrer',
        'first_source',
        'first_medium',
        'first_campaign',
        'first_term',
        'first_content',
        'last_source',
        'last_medium',
        'last_campaign',
        'last_term',
        'last_content',
        'channel',
        'device',
        'user_agent',
        'country',
        'ip_hash',
        'user_id',
        'tenant_id',
        'is_bot',
        'pageview_count',
    ];

    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'channel' => MarketingChannel::class,
            'device' => DeviceCategory::class,
            'is_bot' => 'boolean',
            'pageview_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(MarketingEvent::class, 'visitor_id', 'visitor_id');
    }

    /** @return array<string, string|null> */
    public function firstTouch(): array
    {
        return [
            'source' => $this->first_source,
            'medium' => $this->first_medium,
            'campaign' => $this->first_campaign,
            'term' => $this->first_term,
            'content' => $this->first_content,
        ];
    }

    /** @return array<string, string|null> */
    public function lastTouch(): array
    {
        return [
            'source' => $this->last_source,
            'medium' => $this->last_medium,
            'campaign' => $this->last_campaign,
            'term' => $this->last_term,
            'content' => $this->last_content,
        ];
    }
}
