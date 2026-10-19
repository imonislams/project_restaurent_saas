<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('settings.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'staff_confirmation_mode' => ['required', Rule::in(['central', 'direct'])],
            'branch_direct_order_taking' => ['boolean'],
            'send_confirmed_to_kitchen' => ['boolean'],
        ];
    }
}
