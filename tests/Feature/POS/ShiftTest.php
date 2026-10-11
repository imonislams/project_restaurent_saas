<?php

namespace Tests\Feature\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    public function test_a_shift_can_be_opened_with_an_opening_float(): void
    {
        $this->actingAs($this->user)->post('/shifts/open', [
            'branch_id' => $this->branch->id,
            'opening_float' => 250,
        ])->assertRedirect();

        $shift = Shift::firstOrFail();
        $this->assertTrue($shift->isOpen());
        $this->assertSame(250.0, (float) $shift->opening_float);
        $this->assertSame(250.0, $shift->currentExpectedCash());
        $this->assertDatabaseHas('audit_logs', ['action' => 'shift.opened']);
    }

    public function test_two_open_shifts_on_the_same_branch_are_not_allowed(): void
    {
        app(ShiftService::class)->open($this->branch, $this->user, 100);

        $this->actingAs($this->user)->post('/shifts/open', [
            'branch_id' => $this->branch->id,
            'opening_float' => 50,
        ])->assertSessionHasErrors('shift');
    }

    public function test_cash_in_and_cash_out_adjust_expected_cash(): void
    {
        $shift = app(ShiftService::class)->open($this->branch, $this->user, 100);

        $this->actingAs($this->user)->post("/shifts/{$shift->id}/movements", [
            'direction' => 'in',
            'amount' => 50,
            'reason' => 'Float top-up',
        ])->assertRedirect();

        $this->actingAs($this->user)->post("/shifts/{$shift->id}/movements", [
            'direction' => 'out',
            'amount' => 30,
            'reason' => 'Supplier',
        ])->assertRedirect();

        $this->assertSame(120.0, $shift->fresh()->currentExpectedCash());
    }

    public function test_closing_records_expected_counted_and_variance(): void
    {
        $shift = app(ShiftService::class)->open($this->branch, $this->user, 100);

        $this->actingAs($this->user)->post("/shifts/{$shift->id}/close", [
            'counted_cash' => 92,
        ])->assertRedirect();

        $shift->refresh();
        $this->assertFalse($shift->isOpen());
        $this->assertSame(100.0, (float) $shift->expected_cash);
        $this->assertSame(92.0, (float) $shift->counted_cash);
        $this->assertSame(-8.0, (float) $shift->overage_shortage);
        $this->assertDatabaseHas('audit_logs', ['action' => 'shift.closed']);
    }

    public function test_large_variance_requires_manager_approval(): void
    {
        $this->tenant->mergeSettings(['pos' => ['cash_variance_threshold' => 5]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $shift = app(ShiftService::class)->open($this->branch, $this->user, 100);

        $this->actingAs($this->user)->post("/shifts/{$shift->id}/close", [
            'counted_cash' => 50,
        ])->assertSessionHasErrors('manager_pin');

        $this->assertTrue($shift->fresh()->isOpen());

        app(ManagerPinService::class)->set($this->user, '4321');
        app(TenantContext::class)->set($this->tenant);

        $this->actingAs($this->user)->post("/shifts/{$shift->id}/close", [
            'counted_cash' => 50,
            'manager_pin' => '4321',
        ])->assertRedirect();

        $this->assertFalse($shift->fresh()->isOpen());
    }

    public function test_cash_movement_on_a_closed_shift_is_rejected(): void
    {
        $shift = app(ShiftService::class)->open($this->branch, $this->user, 100);
        app(ShiftService::class)->close($shift, $this->user, 100);

        $this->actingAs($this->user)->post("/shifts/{$shift->id}/movements", [
            'direction' => 'in',
            'amount' => 10,
        ])->assertSessionHasErrors('shift');
    }
}
