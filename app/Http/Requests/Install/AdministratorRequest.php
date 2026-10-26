<?php

namespace App\Http\Requests\Install;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class AdministratorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()],

            'create_owner' => ['boolean'],
            'restaurant_name' => ['required_if:create_owner,true', 'nullable', 'string', 'max:255'],
            'owner_name' => ['required_if:create_owner,true', 'nullable', 'string', 'max:255'],
            'owner_email' => ['required_if:create_owner,true', 'nullable', 'email', 'max:255'],
            'owner_password' => ['required_if:create_owner,true', 'nullable', 'confirmed', Password::min(12)->letters()->numbers()],
        ];
    }
}
