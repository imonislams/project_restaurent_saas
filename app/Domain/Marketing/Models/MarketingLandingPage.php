<?php

namespace App\Domain\Marketing\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A landing page composed from a schema of the existing public marketing blocks.
 * Not a second page builder — the renderer reuses Components/Marketing/*.
 */
class MarketingLandingPage extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'title',
        'seo_meta',
        'sections',
        'status',
        'campaign_id',
        'view_count',
        'lead_count',
        'published_at',
        'preview_token',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'seo_meta' => 'array',
            'sections' => 'array',
            'view_count' => 'integer',
            'lead_count' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(MarketingLead::class, 'landing_page_id');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published' && $this->published_at !== null;
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')->whereNotNull('published_at');
    }
}
