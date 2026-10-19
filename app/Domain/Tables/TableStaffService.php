<?php

namespace App\Domain\Tables;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Table staff assignment.
 *
 * A table may have several assigned staff. The eligible set reuses the existing
 * tenant/branch/permission model: an active user of the branch's tenant who can
 * access the branch and may serve or manage table orders. Assignments are
 * snapshotted onto an order at creation and frozen thereafter, so changing a
 * table's staff never rewrites historical orders.
 */
class TableStaffService
{
    public function __construct(protected AuditLogger $audit) {}

    /**
     * Staff eligible to be assigned to a table in the given branch.
     *
     * @return Collection<int, User>
     */
    public function assignableStaff(Branch $branch): Collection
    {
        return $this->candidates($branch->tenant_id)
            ->filter(fn (User $user) => $this->isAssignable($user, $branch))
            ->values();
    }

    /**
     * Eligible staff keyed by branch id, for the create/edit form picker.
     *
     * @param  Collection<int, Branch>  $branches
     * @return array<int, list<array<string, mixed>>>
     */
    public function assignableStaffByBranch(Collection $branches): array
    {
        $tenantId = $branches->first()?->tenant_id;
        $candidates = $tenantId ? $this->candidates($tenantId) : collect();

        $map = [];

        foreach ($branches as $branch) {
            $map[$branch->getKey()] = $candidates
                ->filter(fn (User $user) => $this->isAssignable($user, $branch))
                ->map(fn (User $user) => $this->option($user))
                ->values()
                ->all();
        }

        return $map;
    }

    /**
     * Whether a user may be assigned to a table in the branch.
     */
    public function isAssignable(User $user, Branch $branch): bool
    {
        return (int) $user->tenant_id === (int) $branch->tenant_id
            && $user->isActive()
            && $user->canAccessBranch($branch)
            && $user->canServeTableOrders();
    }

    /**
     * Replace a table's staff assignment with the given user ids.
     *
     * @param  list<int|string>  $userIds
     * @return bool  whether the assignment actually changed
     */
    public function sync(Table $table, array $userIds, User $actor): bool
    {
        $branch = Branch::query()->find($table->branch_id);

        // Fail closed: only eligible staff are ever persisted.
        $valid = $branch ? $this->assignableStaff($branch)->pluck('id')->all() : [];
        $ids = array_values(array_intersect(array_map('intval', $userIds), $valid));
        sort($ids);

        $before = $table->staff()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        sort($before);

        $table->staff()->syncWithPivotValues($ids, ['tenant_id' => $table->tenant_id]);
        $table->unsetRelation('staff');

        $this->audit->log('table.staff_updated', $table, [
            'before' => $before,
            'after' => $ids,
            'open_orders' => $table->orders()
                ->whereNotIn('status', ['completed', 'voided'])
                ->count(),
        ], $actor, $table->tenant_id);

        return $before !== $ids;
    }

    /**
     * Freeze the table's current staff onto a newly created order.
     */
    public function snapshotToOrder(Order $order, Table $table): void
    {
        $staffIds = $table->staff()->pluck('users.id')->all();

        if ($staffIds === []) {
            return;
        }

        $names = User::query()->whereIn('id', $staffIds)->pluck('name', 'id');

        $rows = [];
        foreach ($staffIds as $id) {
            $rows[$id] = ['tenant_id' => $order->tenant_id, 'name' => (string) $names[$id]];
        }

        $order->staff()->syncWithoutDetaching($rows);
    }

    /**
     * @return Collection<int, User>
     */
    protected function candidates(int $tenantId): Collection
    {
        return User::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->whereNull('deactivated_at')
            ->with('roles.permissions')
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    protected function option(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->values()->all(),
        ];
    }
}
