<?php

namespace Tests\Feature\Demo;

use App\Domain\Demo\DemoDataService;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Identity\Enums\RoleName;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

class DemoSettingsTest extends DemoTestCase
{
    public function test_the_demo_tab_renders_for_the_owner(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();
        $this->seedDemoRun($tenant);

        $this->actingAs($owner)
            ->get('/settings/demo')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Demo')
                ->where('demo.status', 'completed')
                ->where('demo.days', 3)
                ->where('demo.records', 1)
                ->where('currency', 'BDT')
                ->has('history', 1));
    }

    public function test_the_demo_tab_reports_an_empty_workspace(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();

        $this->actingAs($owner)
            ->get('/settings/demo')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Demo')
                ->where('demo.status', 'none')
                ->has('history', 0));
    }

    public function test_a_cashier_cannot_manage_demo_data(): void
    {
        [$tenant] = $this->tenantReadyForDemo();

        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/settings/demo')->assertForbidden();
        $this->actingAs($cashier)->post('/demo/step')->assertForbidden();
        $this->actingAs($cashier)->post('/demo/generate')->assertForbidden();
        $this->actingAs($cashier)->post('/demo/purge', ['confirm' => $tenant->slug])->assertForbidden();
        $this->actingAs($cashier)->post('/settings/demo/rebuild')->assertForbidden();
    }

    public function test_removal_requires_the_exact_workspace_slug(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();
        [, $category] = $this->seedDemoRun($tenant);

        $this->actingAs($owner)
            ->from('/settings/demo')
            ->post('/demo/purge', ['confirm' => 'not-the-slug'])
            ->assertRedirect('/settings/demo')
            ->assertSessionHasErrors('confirm');

        $this->assertDatabaseHas('categories', ['id' => $category->getKey()]);
    }

    public function test_removal_deletes_the_demo_and_is_audited(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();
        [, $category] = $this->seedDemoRun($tenant);

        $this->actingAs($owner)
            ->post('/demo/purge', ['confirm' => $tenant->slug])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('categories', ['id' => $category->getKey()]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'demo.data_purged']);
        $this->assertSame('removed', DemoDataBatch::query()->where('tenant_id', $tenant->getKey())->value('status'));
    }

    public function test_rebuild_starts_a_fresh_run(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();
        $this->seedDemoRun($tenant);

        $this->actingAs($owner)
            ->post('/settings/demo/rebuild')
            ->assertRedirect(route('demo.setup'));

        $batch = DemoDataBatch::query()
            ->where('tenant_id', $tenant->getKey())
            ->latest('id')
            ->first();

        $this->assertNotNull($batch);
        $this->assertSame('pending', $batch->status);
        $this->assertSame(DemoDataService::DEFAULT_DAYS, $batch->days, 'rebuild uses the standard coverage');
        $this->assertDatabaseHas('demo_data_batches', ['tenant_id' => $tenant->getKey(), 'status' => 'removed']);
    }

    /**
     * The progress screen drives generation over JSON, one step per request.
     * A return-type mistake here once turned every step into a 500 while the
     * data was still written, so this path needs its own coverage.
     */
    public function test_the_step_endpoint_advances_and_returns_json_state(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();

        $batch = app(DemoDataService::class)->start($tenant, $owner);

        $response = $this->actingAs($owner)->postJson('/demo/step');

        $response->assertOk()
            ->assertJsonPath('error', null)
            ->assertJsonPath('demo.steps_done', 1)
            ->assertJsonPath('demo.steps_total', $batch->steps_total)
            ->assertJsonStructure(['demo' => ['status', 'steps_done', 'steps_total', 'percent'], 'error']);

        $this->assertSame(DemoDataBatch::STATUS_RUNNING, $batch->fresh()->status);
    }

    public function test_the_step_endpoint_reports_a_failure_instead_of_hiding_it(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();

        // A batch with no branch refs cannot run its first step.
        DemoDataBatch::create([
            'tenant_id' => $tenant->getKey(),
            'status' => DemoDataBatch::STATUS_PENDING,
            'days' => 15,
            'steps_total' => 1,
            'refs' => [],
            'started_at' => now(),
        ]);

        $response = $this->actingAs($owner)->postJson('/demo/step');

        $response->assertOk()->assertJsonPath('demo.status', DemoDataBatch::STATUS_FAILED);
        $this->assertNotSame('', (string) $response->json('error'));
    }
}
