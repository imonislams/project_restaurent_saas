<?php

namespace App\Domain\Communications\Models;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An outbound email record. Retry metadata is stored when the message is one we
 * can reconstruct (e.g. an invoice email).
 */
class EmailLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'message_id',
        'to_email',
        'from_email',
        'subject',
        'body',
        'content_type',
        'mailer',
        'status',
        'attempts',
        'error',
        'retry_class',
        'retry_payload',
        'sent_at',
        'failed_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'retry_payload' => 'array',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isRetryable(): bool
    {
        return $this->retry_class !== null && $this->status === 'failed';
    }
}
