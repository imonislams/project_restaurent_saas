<?php

namespace App\Http\Requests\Tables;

use App\Domain\Tables\Enums\TableStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TableStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('tables.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(TableStatus::values())],
        ];
    }
}
