<?php

namespace App\Http\Requests\CashManagement;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OpenShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('pos.use') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'register_id' => ['nullable', 'integer', Rule::exists('registers', 'id')->where('tenant_id', $tenantId)],
            'opening_float' => ['required', 'numeric', 'min:0'],
        ];
    }
}
