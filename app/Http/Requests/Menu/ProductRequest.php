<?php

namespace App\Http\Requests\Menu;

use App\Domain\Menu\Enums\InventoryMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('menu.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;
        $productId = $this->route('product')?->getKey();

        return [
            'name' => ['required', 'string', 'max:255'],
            'category_id' => [
                'nullable', 'integer',
                Rule::exists('categories', 'id')->where('tenant_id', $tenantId),
            ],
            'description' => ['nullable', 'string'],
            'sku' => [
                'nullable', 'string', 'max:100',
                Rule::unique('products', 'sku')->where('tenant_id', $tenantId)->ignore($productId),
            ],
            'barcode' => ['nullable', 'string', 'max:100'],
            'tax_category' => ['nullable', 'string', 'max:50'],
            'price_dine_in' => ['required', 'numeric', 'min:0'],
            'price_takeaway' => ['required', 'numeric', 'min:0'],
            'price_delivery' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'labels' => ['nullable', 'array'],
            'labels.*' => ['string', 'max:30'],
            'inventory_mode' => ['required', Rule::in(InventoryMode::values())],
            'is_active' => ['boolean'],
            'is_available' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['required', 'string', 'max:100'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.price' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
