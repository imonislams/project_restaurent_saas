<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BillingSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('settings.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'billing_name' => ['nullable', 'string', 'max:255'],
            'billing_email' => ['nullable', 'email', 'max:255'],
            'billing_country' => ['nullable', Rule::in(array_keys(config('geo.countries', [])))],
            'billing_currency' => ['nullable', Rule::in(array_keys(config('geo.currencies', [])))],
            'billing_address' => ['nullable', 'string', 'max:255'],
            'billing_city' => ['nullable', 'string', 'max:120'],
            'billing_postal_code' => ['nullable', 'string', 'max:30'],
            'billing_tax_id' => ['nullable', 'string', 'max:60'],
        ];
    }
}
