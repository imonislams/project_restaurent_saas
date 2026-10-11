<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkTenantActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('platform.tenants.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['activate', 'suspend', 'verify', 'archive'])],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', Rule::exists('tenants', 'id')],
            'reason' => ['required_if:action,suspend', 'nullable', 'string', 'min:3', 'max:500'],
        ];
    }
}
