<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class PosSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('settings.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'service_charge_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'pos_allow_partial' => ['boolean'],
            'pos_cash_variance_threshold' => ['nullable', 'numeric', 'min:0'],
            'pos_discount_approval_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payments_provider' => ['nullable', 'string', 'max:50'],
        ];
    }
}
