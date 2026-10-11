<?php

namespace App\Http\Requests\Platform;

use App\Domain\Support\Enums\TicketStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupportTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('platform.support.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(TicketStatus::values())],
        ];
    }
}
