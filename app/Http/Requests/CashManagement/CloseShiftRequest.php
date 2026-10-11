<?php

namespace App\Http\Requests\CashManagement;

use Illuminate\Foundation\Http\FormRequest;

class CloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('pos.use') ?? false;
    }

    public function rules(): array
    {
        return [
            'counted_cash' => ['required', 'numeric', 'min:0'],
            'manager_pin' => ['nullable', 'string', 'max:12'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
