<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('platform.marketing.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:20000'],
            'audience' => ['nullable', 'array'],
            'audience.status' => ['nullable', 'string', Rule::in(array_map(fn ($c) => $c->value, \App\Domain\Tenancy\Enums\TenantStatus::cases()))],
            'audience.plan' => ['nullable', 'string', 'max:80'],
        ];
    }
}
