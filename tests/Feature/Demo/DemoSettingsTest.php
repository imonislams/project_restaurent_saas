<?php

namespace Tests\Feature\Demo;

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
                ->where('demo.days', 15)
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
        $this->assertSame(15, $batch->days, 'rebuild keeps the previous coverage');
        $this->assertDatabaseHas('demo_data_batches', ['tenant_id' => $tenant->getKey(), 'status' => 'removed']);
    }
}
