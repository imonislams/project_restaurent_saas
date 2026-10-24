<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('identifier_type') === 'phone' && is_string($this->input('phone'))) {
            $digits = preg_replace('/[^\d+]/', '', $this->input('phone')) ?? '';
            $this->merge(['phone' => $digits === '' ? null : '+'.ltrim($digits, '+')]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'identifier_type' => ['required', Rule::in(['email', 'phone'])],
            'plan' => ['nullable', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'restaurant_name' => ['required', 'string', 'max:255'],
            'email' => ['required_if:identifier_type,email', 'nullable', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'phone' => ['required_if:identifier_type,phone', 'nullable', 'string', 'max:32', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];
    }
}
