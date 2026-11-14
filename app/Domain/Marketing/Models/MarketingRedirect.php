<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An admin-managed redirect. Chain depth and loops are validated by RedirectService
 * on save and re-validated on use.
 */
class MarketingRedirect extends Model
{
    use SoftDeletes;

    public const STATUS_CODES = [301, 302, 307, 308];

    protected $fillable = [
        'from_path',
        'to_url',
        'status_code',
        'is_active',
        'hits',
        'last_hit_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'is_active' => 'boolean',
            'hits' => 'integer',
            'last_hit_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isPermanent(): bool
    {
        return $this->status_code === 301;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function normalisePath(string $path): string
    {
        $path = trim($path);

        // Accept a full URL and keep only its path, so pasting a URL is safe.
        if (preg_match('#^https?://#i', $path) === 1) {
            $path = (string) parse_url($path, PHP_URL_PATH);
        }

        $path = '/'.ltrim($path, '/');

        return $path === '/' ? '/' : rtrim($path, '/');
    }
}
