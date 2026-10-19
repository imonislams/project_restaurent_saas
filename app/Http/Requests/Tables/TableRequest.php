<?php

namespace App\Http\Requests\Tables;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\TableStaffService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('tables.manage') ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'branch_id' => [
                'required',
                'integer',
                Rule::exists('branches', 'id')->where('tenant_id', $tenantId),
                Rule::in($this->user()->accessibleBranchIds()),
            ],
            'dining_area_id' => ['nullable', 'integer', Rule::exists('dining_areas', 'id')->where('tenant_id', $tenantId)],
            'name' => ['required', 'string', 'max:100'],
            'seats' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'staff_ids' => ['nullable', 'array'],
            'staff_ids.*' => ['integer', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
        ];
    }

    /**
     * Reject staff who are not eligible for the selected branch (active, branch
     * access, and able to serve or manage table orders).
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $branchId = $this->input('branch_id');
                $staffIds = $this->input('staff_ids') ?? [];

                if (! $branchId || $staffIds === []) {
                    return;
                }

                $branch = Branch::query()->find($branchId);

                if (! $branch) {
                    return; // branch_id rule already reported this
                }

                $eligible = app(TableStaffService::class)->assignableStaff($branch)->pluck('id')->all();

                foreach (array_values($staffIds) as $index => $id) {
                    if (! in_array((int) $id, $eligible, true)) {
                        $validator->errors()->add(
                            "staff_ids.{$index}",
                            'The selected staff member is not eligible for this branch.',
                        );
                    }
                }
            },
        ];
    }
}
