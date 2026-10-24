<?php

namespace App\Http\Requests\POS;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A batch of operations captured while a device was offline. The operation
 * payloads are validated separately (see OfflineSyncService) with the same rules
 * as their live counterparts.
 */
class SyncOfflineOperationsRequest extends FormRequest
{
    public const TYPES = ['place_sale', 'open_order', 'settle_order'];

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('pos.use') ?? false;
    }

    public function rules(): array
    {
        return [
            'operations' => ['required', 'array', 'min:1', 'max:50'],
            'operations.*.uuid' => ['required', 'string', 'max:100'],
            'operations.*.type' => ['required', Rule::in(self::TYPES)],
            'operations.*.captured_at' => ['nullable', 'date'],
            'operations.*.offline_reference' => ['nullable', 'string', 'max:100'],
            'operations.*.expected_total' => ['nullable', 'numeric'],
            'operations.*.payload' => ['required', 'array'],
        ];
    }
}
