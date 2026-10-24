<?php

namespace App\Http\Requests\Staff;

use App\Domain\Identity\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('staff.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'email' => [
                'required', 'string', 'lowercase', 'email', 'max:255',
                Rule::unique(User::class, 'email'),
                Rule::unique('invitations', 'email')->where('tenant_id', $tenantId)->whereNull('accepted_at'),
            ],
            'name' => ['nullable', 'string', 'max:255'],
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

    public function messages(): array
    {
        return [
            'email.unique' => 'This email has already been invited or registered.',
            'roles.*.not_in' => 'The selected role cannot be assigned.',
        ];
    }
}
