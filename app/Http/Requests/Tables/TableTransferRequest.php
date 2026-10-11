<?php

namespace App\Http\Requests\Tables;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TableTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('tables.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'order_id' => ['required', 'integer', Rule::exists('orders', 'id')->where('tenant_id', $tenantId)],
            'table_id' => ['required', 'integer', Rule::exists('tables', 'id')->where('tenant_id', $tenantId)],
        ];
    }
}
