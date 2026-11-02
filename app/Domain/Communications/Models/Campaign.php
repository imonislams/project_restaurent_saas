<?php

namespace App\Domain\Communications\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use App\Domain\Marketing\Models\MarketingEmailSend;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    protected $fillable = [
        'name',
        'subject',
        'body',
        'audience',
        'status',
        'scheduled_at',
        'sent_at',
        'recipients_count',
        'created_by',
        // Marketing extensions (see 2026_11_01_000012).
        'channel',
        'template_key',
        'segment_id',
        'from_name',
        'from_email',
        'reply_to',
        'marketing_campaign_id',
        'utm',
        'track_opens',
        'track_clicks',
        'scheduled_timezone',
        'total_recipients',
        'sent_count',
        'failed_count',
        'open_count',
        'click_count',
        'bounce_count',
        'unsubscribe_count',
    ];

    protected function casts(): array
    {
        return [
            'audience' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
            'recipients_count' => 'integer',
            'segment_id' => 'integer',
            'marketing_campaign_id' => 'integer',
            'utm' => 'array',
            'track_opens' => 'boolean',
            'track_clicks' => 'boolean',
            'total_recipients' => 'integer',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
            'open_count' => 'integer',
            'click_count' => 'integer',
            'bounce_count' => 'integer',
            'unsubscribe_count' => 'integer',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Per-recipient delivery rows for a marketing send. */
    public function sends(): HasMany
    {
        return $this->hasMany(MarketingEmailSend::class, 'campaign_id');
    }
}
