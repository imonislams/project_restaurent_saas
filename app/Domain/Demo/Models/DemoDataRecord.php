<?php

namespace App\Domain\Demo\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Append-only ledger of every row a demo batch created. Removal replays this
 * ledger (children → parents) and the plan-limit checks exclude these rows, so
 * sample records never count as real tenant usage.
 */
class DemoDataRecord extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'batch_id',
        'tenant_id',
        'model_type',
        'model_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /**
     * Add a "not demo data" constraint to a query over another model's table —
     * used by usage/plan-limit counting so sample rows never consume a real
     * tenant's limits.
     *
     * @param  class-string<Model>  $model
     */
    public static function excludingDemo(Builder $query, string $model, ?string $column = null): Builder
    {
        $type = (new $model)->getMorphClass();
        $column = $column ?? $query->getModel()->getTable().'.id';

        return $query->whereNotExists(function ($sub) use ($type, $column) {
            $sub->from('demo_data_records as demo_records')
                ->selectRaw('1')
                ->whereColumn('demo_records.model_id', $column)
                ->where('demo_records.model_type', $type);
        });
    }
}
