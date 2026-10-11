<?php

namespace App\Http\Requests\Kitchen;

use App\Domain\Kitchen\Enums\KitchenItemStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ItemStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('kitchen.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(KitchenItemStatus::values())],
        ];
    }
}
