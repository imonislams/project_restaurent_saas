<?php

namespace Tests\Feature\Demo;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Branches\Models\Branch;
use App\Domain\Demo\DemoDataService;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Models\Category;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Shared setup for the demo suites: a tenant that is ready for generation (one
 * branch, owner, tax region) and a helper that drives a full run.
 */
abstract class DemoTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        Queue::fake();
        Notification::fake();
        Mail::fake();
    }

    /** @return array{0: Tenant, 1: User, 2: Branch} */
    protected function tenantReadyForDemo(): array
    {
        $tenant = Tenant::factory()->create();

        $tenant->mergeSettings([
            'region' => ['country' => 'BD', 'currency' => 'BDT', 'timezone' => 'Asia/Dhaka'],
            'tax' => ['name' => 'VAT', 'rate' => 5, 'inclusive' => false],
        ]);
        $tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($tenant);
        app(ProvisionAccountingDefaults::class)->forTenant($tenant);

        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $branch = $tenant->branches()->create([
            'name' => 'Main Branch',
            'code' => 'MAIN',
            'timezone' => 'Asia/Dhaka',
            'currency' => 'BDT',
            'service_types' => ['dine_in', 'takeaway', 'delivery', 'counter'],
            'is_active' => true,
            'is_primary' => true,
        ]);

        $owner->syncBranchAccess([$branch->getKey()]);

        app(TenantContext::class)->set($tenant);

        return [$tenant, $owner, $branch];
    }

    /**
     * Start a run and execute every step. The day plan is trimmed to a short
     * window: the per-day step is identical either way, and three weeks of trade
     * per test would only slow the suite down.
     */
    protected function runDemo(Tenant $tenant, User $owner, int $days = 2): DemoDataBatch
    {
        $demo = app(DemoDataService::class);
        $batch = $demo->start($tenant, $owner);

        $timezone = (string) ($tenant->getSetting('region.timezone') ?? config('app.timezone'));
        $today = now($timezone)->startOfDay();
        $plan = [];

        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $plan[] = $today->copy()->subDays($offset)->toDateString();
        }

        $batch->mergeRefs(['day_plan' => $plan]);
        $batch->forceFill(['steps_total' => count($demo->stepsFor($batch))])->save();

        $guard = 0;

        while ($batch->isActive() && $guard++ < 40) {
            $batch = $demo->runNextStep($batch);
        }

        return $batch;
    }

    /**
     * A completed run with a single traced row — enough to exercise the settings
     * tab and removal without generating days of trade.
     *
     * @return array{0: DemoDataBatch, 1: Category}
     */
    protected function seedDemoRun(Tenant $tenant): array
    {
        $batch = DemoDataBatch::create([
            'tenant_id' => $tenant->getKey(),
            'status' => DemoDataBatch::STATUS_COMPLETED,
            'days' => 3,
            'steps_total' => 3,
            'steps_done' => 3,
            'completed_steps' => ['team', 'menu', 'finalize'],
            'counts' => [
                'currency' => 'BDT',
                'days' => 3,
                'orders' => 40,
                'revenue' => 45000,
                'customers' => 12,
                'products' => 50,
            ],
            'started_at' => now()->subHour(),
            'completed_at' => now(),
        ]);

        $category = Category::create([
            'tenant_id' => $tenant->getKey(),
            'name' => 'Demo Category',
            'slug' => 'demo-category',
            'is_active' => true,
        ]);

        DemoDataRecord::create([
            'batch_id' => $batch->getKey(),
            'tenant_id' => $tenant->getKey(),
            'model_type' => (new Category)->getMorphClass(),
            'model_id' => $category->getKey(),
            'created_at' => now(),
        ]);

        return [$batch, $category];
    }
}
