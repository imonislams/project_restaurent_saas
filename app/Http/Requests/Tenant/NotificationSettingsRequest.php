<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;

class NotificationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('settings.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'low_stock_threshold' => ['nullable', 'numeric', 'min:0'],
            'loyalty_enabled' => ['boolean'],
            'loyalty_points_per_currency' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
