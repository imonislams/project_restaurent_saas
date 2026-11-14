<?php

namespace App\Http\Requests\Orders;

use App\Http\Requests\POS\PlaceOrderRequest;
use Illuminate\Foundation\Http\FormRequest;

class AppendOrderItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($this->user()?->hasPermission('pos.use') ?? false)
            && ($this->user()?->hasPermission('orders.update') ?? false);
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['required', 'string', 'max:100'],
            ...PlaceOrderRequest::itemRules($this->user()->tenant_id),
        ];
    }
}
