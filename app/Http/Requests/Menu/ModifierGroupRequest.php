<?php

namespace App\Http\Requests\Menu;

use App\Domain\Menu\Enums\ModifierSelectionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModifierGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('modifiers.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'selection_type' => ['required', Rule::in(ModifierSelectionType::values())],
            'min_select' => ['nullable', 'integer', 'min:0', 'max:50'],
            'max_select' => ['nullable', 'integer', 'min:1', 'max:50'],
            'is_required' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],

            'products' => ['nullable', 'array'],
            'products.*' => ['integer', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],

            'options' => ['nullable', 'array'],
            'options.*.name' => ['required', 'string', 'max:120'],
            'options.*.sku' => ['nullable', 'string', 'max:100'],
            'options.*.price_delta' => ['nullable', 'numeric'],
            'options.*.is_default' => ['boolean'],
            'options.*.is_active' => ['boolean'],
        ];
    }
}
