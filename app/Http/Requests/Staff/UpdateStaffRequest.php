<?php

namespace App\Http\Requests\Staff;

use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('staff.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [
                'string',
                Rule::exists('roles', 'slug')->where(function ($query) use ($tenantId) {
                    $query->whereNull('tenant_id');

                    if ($tenantId !== null) {
                        $query->orWhere('tenant_id', $tenantId);
                    }
                }),
                Rule::notIn(RoleName::platformValues()),
            ],
            'branch_ids' => ['nullable', 'array'],
            'branch_ids.*' => [
                'integer',
                Rule::exists('branches', 'id')->where('tenant_id', $tenantId),
                Rule::in($this->user()->accessibleBranchIds()),
            ],
        ];
    }
}
