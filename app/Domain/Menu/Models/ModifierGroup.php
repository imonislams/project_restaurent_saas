<?php

namespace App\Domain\Menu\Models;

use App\Domain\Menu\Enums\ModifierSelectionType;
use App\Domain\Menu\Factories\ModifierGroupFactory;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ModifierGroup extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'selection_type',
        'min_select',
        'max_select',
        'is_required',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'selection_type' => ModifierSelectionType::class,
            'min_select' => 'integer',
            'max_select' => 'integer',
            'is_required' => 'boolean',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    protected static function newFactory(): ModifierGroupFactory
    {
        return ModifierGroupFactory::new();
    }

    public function options(): HasMany
    {
        return $this->hasMany(ModifierOption::class)->orderBy('sort_order');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'modifier_group_product')
            ->using(ModifierGroupProduct::class)
            ->withPivot('sort_order')
            ->withTimestamps();
    }

    /** Effective maximum selections (single-choice groups are capped at one). */
    public function effectiveMax(): int
    {
        return $this->selection_type === ModifierSelectionType::Single ? 1 : max(1, $this->max_select);
    }

    public function effectiveMin(): int
    {
        return $this->is_required ? max(1, $this->min_select) : $this->min_select;
    }
}
