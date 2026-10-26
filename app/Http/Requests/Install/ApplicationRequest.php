<?php

namespace App\Http\Requests\Install;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'url' => ['required', 'url', 'max:255'],
            'timezone' => ['required', 'string', Rule::in(array_values((array) config('geo.timezones', ['UTC'])))],
        ];
    }
}
