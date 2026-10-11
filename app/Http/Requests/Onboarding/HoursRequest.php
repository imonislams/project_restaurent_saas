<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class HoursRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'days' => ['required', 'array', 'min:1'],
            'days.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'days.*.is_closed' => ['required', 'boolean'],
            'days.*.opens_at' => ['nullable', 'date_format:H:i'],
            'days.*.closes_at' => ['nullable', 'date_format:H:i', 'after:days.*.opens_at'],
        ];
    }

    public function messages(): array
    {
        return [
            'days.*.closes_at.after' => 'Closing time must be after the opening time.',
        ];
    }
}
