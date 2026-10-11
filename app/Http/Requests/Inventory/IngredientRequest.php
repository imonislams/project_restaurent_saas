<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IngredientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('inventory.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'unit_id' => [
                'nullable', 'integer',
                Rule::exists('units', 'id')->where('tenant_id', $tenantId),
            ],
            'cost_per_unit' => ['nullable', 'numeric', 'min:0'],
            'track_inventory' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }
}
