<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The suppression list. Checked at send time inside the job, so adding an address
 * here stops an already-queued campaign.
 */
class MarketingEmailSuppression extends Model
{
    public const UPDATED_AT = null;

    public const REASONS = [
        'unsubscribe', 'bounce', 'complaint', 'manual', 'invalid',
    ];

    protected $fillable = [
        'email',
        'reason',
        'added_by',
    ];

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public static function normalise(string $email): string
    {
        return strtolower(trim($email));
    }
}
