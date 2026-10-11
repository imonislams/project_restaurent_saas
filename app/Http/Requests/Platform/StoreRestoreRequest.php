<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('platform.backups.restore') ?? false;
    }

    public function rules(): array
    {
        return [
            'backup_id' => ['required', 'integer', Rule::exists('backups', 'id')->where('scope', 'tenant')],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }
}
