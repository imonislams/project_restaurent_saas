<?php

namespace App\Domain\Marketing\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One URL in the generated sitemap. Rows are derived from the route registry plus
 * published landing pages and articles, and can be overridden per path.
 */
class MarketingSitemapEntry extends Model
{
    protected $fillable = [
        'path',
        'priority',
        'changefreq',
        'is_enabled',
        'lastmod',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'priority' => 'decimal:1',
            'is_enabled' => 'boolean',
            'lastmod' => 'date',
        ];
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function absoluteUrl(?string $host = null): string
    {
        $host = rtrim($host ?? (string) config('app.url'), '/');

        return $host.'/'.ltrim($this->path, '/');
    }
}
