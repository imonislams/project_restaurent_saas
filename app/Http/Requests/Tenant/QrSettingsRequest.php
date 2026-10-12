<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QrSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('settings.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'qr_enabled' => ['boolean'],
            'qr_guest_checkout' => ['boolean'],
            'qr_require_phone' => ['boolean'],
            'qr_require_email' => ['boolean'],
            'qr_session_timeout_minutes' => ['nullable', 'integer', 'min:15', 'max:1440'],
            'qr_auto_accept' => ['boolean'],
            'qr_allow_additional_orders' => ['boolean'],
            'qr_allow_notes' => ['boolean'],
            'qr_live_tracking' => ['boolean'],
            'qr_allow_bill_request' => ['boolean'],
            'qr_billing_mode' => ['required', Rule::in(['consolidated', 'individual'])],
            'qr_digital_receipt' => ['boolean'],
            'qr_feedback' => ['boolean'],
            'qr_loyalty' => ['boolean'],
        ];
    }
}
