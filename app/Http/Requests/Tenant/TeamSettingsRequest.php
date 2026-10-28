<?php

namespace App\Http\Requests\Tenant;

use App\Domain\Identity\Enums\InvitationVerification;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TeamSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('settings.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'invitation_verification' => ['required', 'string', Rule::in(InvitationVerification::values())],
        ];
    }
}
