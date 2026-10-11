<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class TaxRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'tax_name' => ['required', 'string', 'max:100'],
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'tax_inclusive' => ['boolean'],
        ];
    }
}
