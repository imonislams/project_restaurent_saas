<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-page SEO metadata. A NULL field means "inherit the global default", which is
 * what makes it impossible to leave a page without metadata.
 */
class MarketingSeoMeta extends Model
{
    /**
     * Eloquent would pluralise "Meta" into `marketing_seo_metas`; the table is
     * `marketing_seo_meta`. Without this the metadata lookup fails and every page
     * silently falls back to no metadata at all.
     */
    protected $table = 'marketing_seo_meta';

    protected $fillable = [
        'route_key',
        'path',
        'title',
        'description',
        'canonical',
        'og_title',
        'og_description',
        'og_image',
        'og_type',
        'twitter_card',
        'robots',
        'schema',
        'alt_texts',
        'is_auto',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'schema' => 'array',
            'alt_texts' => 'array',
            'is_auto' => 'boolean',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** The fields this record actually overrides. */
    public function overrides(): array
    {
        return array_filter([
            'title' => $this->title,
            'description' => $this->description,
            'canonical' => $this->canonical,
            'og_title' => $this->og_title,
            'og_description' => $this->og_description,
            'og_image' => $this->og_image,
            'og_type' => $this->og_type,
            'twitter_card' => $this->twitter_card,
            'robots' => $this->robots,
        ], fn ($value) => $value !== null && $value !== '');
    }

    public function scopeForRoute($query, string $routeKey)
    {
        return $query->where('route_key', $routeKey);
    }
}
