<?php

namespace App\Http\Requests\Orders;

use App\Domain\Orders\Enums\FulfillmentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FulfillmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('orders.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'fulfillment_status' => ['required', Rule::in(FulfillmentStatus::values())],
        ];
    }
}
