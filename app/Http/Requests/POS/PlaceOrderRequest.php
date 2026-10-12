<?php

namespace App\Http\Requests\POS;

use App\Domain\Orders\Enums\OrderType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlaceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('pos.use') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'shift_id' => ['nullable', 'integer', Rule::exists('shifts', 'id')->where('tenant_id', $tenantId)],
            'order_type' => ['required', Rule::in(OrderType::values())],
            'table_id' => ['nullable', 'integer', Rule::exists('tables', 'id')->where('tenant_id', $tenantId)],
            'customer_id' => ['nullable', 'integer', Rule::exists('customers', 'id')->where('tenant_id', $tenantId)],
            'delivery_zone_id' => ['nullable', 'integer', Rule::exists('delivery_zones', 'id')->where('tenant_id', $tenantId)],
            'delivery_address' => ['nullable', 'string', 'max:255'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_phone' => ['nullable', 'string', 'max:50'],
            'covers' => ['nullable', 'integer', 'min:1', 'max:100'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'discount_type' => ['nullable', Rule::in(['none', 'amount', 'percent'])],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'service_charge' => ['boolean'],
            'manager_pin' => ['nullable', 'string', 'max:12'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'items.*.variant_id' => ['nullable', 'integer', Rule::exists('product_variants', 'id')->where('tenant_id', $tenantId)],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'items.*.modifiers' => ['nullable', 'array'],
            'items.*.modifiers.*.option_id' => ['required_with:items.*.modifiers', 'integer', Rule::exists('modifier_options', 'id')->where('tenant_id', $tenantId)],
            'items.*.modifiers.*.quantity' => ['nullable', 'numeric', 'min:1'],

            'payments' => ['nullable', 'array'],
            'payments.*.payment_method_id' => ['required_with:payments', 'integer', Rule::exists('payment_methods', 'id')->where('tenant_id', $tenantId)],
            'payments.*.amount' => ['required', 'numeric', 'min:0'],
            'payments.*.tendered' => ['nullable', 'numeric', 'min:0'],
            'payments.*.reference' => ['nullable', 'string', 'max:255'],
        ];
    }
}
