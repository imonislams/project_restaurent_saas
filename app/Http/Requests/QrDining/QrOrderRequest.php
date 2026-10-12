<?php

namespace App\Http\Requests\QrDining;

use App\Domain\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a public QR order submission. Tenant scoping comes from the token
 * resolved server-side (not from the request body).
 */
class QrOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->tenantId();

        return [
            'idempotency_key' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'items.*.variant_id' => ['nullable', 'integer', Rule::exists('product_variants', 'id')->where('tenant_id', $tenantId)],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'items.*.modifiers' => ['nullable', 'array'],
            'items.*.modifiers.*.option_id' => ['required_with:items.*.modifiers', 'integer', Rule::exists('modifier_options', 'id')->where('tenant_id', $tenantId)],
            'items.*.modifiers.*.quantity' => ['nullable', 'numeric', 'min:1'],
        ];
    }
}
