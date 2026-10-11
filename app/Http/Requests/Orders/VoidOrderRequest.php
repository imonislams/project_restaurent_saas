<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;

class VoidOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('orders.void') ?? false;
    }

    public function rules(): array
    {
        return [
            'manager_pin' => ['nullable', 'string', 'max:12'],
        ];
    }
}
