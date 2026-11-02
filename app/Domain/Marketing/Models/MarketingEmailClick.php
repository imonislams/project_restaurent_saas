<?php

namespace App\Domain\Marketing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A tracked click on a link inside a marketing email.
 */
class MarketingEmailClick extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'send_id',
        'url',
        'user_agent',
        'ip_hash',
    ];

    public function send(): BelongsTo
    {
        return $this->belongsTo(MarketingEmailSend::class, 'send_id');
    }
}
