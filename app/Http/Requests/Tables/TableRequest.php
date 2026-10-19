<?php

namespace App\Http\Requests\Tables;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('tables.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'branch_id' => [
                'required',
                'integer',
                Rule::exists('branches', 'id')->where('tenant_id', $tenantId),
                Rule::in($this->user()->accessibleBranchIds()),
            ],
            'dining_area_id' => ['nullable', 'integer', Rule::exists('dining_areas', 'id')->where('tenant_id', $tenantId)],
            'name' => ['required', 'string', 'max:100'],
            'seats' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
