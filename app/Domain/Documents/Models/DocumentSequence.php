<?php

namespace App\Domain\Documents\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class DocumentSequence extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'type', 'last_number'];

    protected function casts(): array
    {
        return ['last_number' => 'integer'];
    }
}
