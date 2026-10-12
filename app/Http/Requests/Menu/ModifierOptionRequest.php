<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModifierOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('modifiers.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'modifier_group_id' => ['required', 'integer', Rule::exists('modifier_groups', 'id')->where('tenant_id', $tenantId)],
            'name' => ['required', 'string', 'max:120'],
            'sku' => ['nullable', 'string', 'max:100'],
            'price_delta' => ['nullable', 'numeric'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
