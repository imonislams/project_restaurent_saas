<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('inventory.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;
        $unitId = $this->route('unit')?->getKey();

        return [
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'required', 'string', 'max:20',
                Rule::unique('units', 'code')->where('tenant_id', $tenantId)->ignore($unitId),
            ],
        ];
    }
}
