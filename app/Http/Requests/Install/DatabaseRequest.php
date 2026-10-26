<?php

namespace App\Http\Requests\Install;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DatabaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'driver' => ['required', Rule::in(['mysql', 'mariadb', 'pgsql'])],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'database' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'confirm_existing' => ['boolean'],
        ];
    }
}
