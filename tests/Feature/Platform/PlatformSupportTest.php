<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Models\SupportTicket;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformSupportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_support_ticket_can_be_created_with_a_first_message(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->post('/platform/support', [
            'tenant_id' => $tenant->id,
            'subject' => 'Cannot print receipts',
            'body' => 'The printer stopped working after the update.',
            'priority' => 'high',
        ])->assertRedirect();

        $ticket = SupportTicket::firstOrFail();
        $this->assertSame($tenant->id, $ticket->tenant_id);
        $this->assertSame(TicketStatus::Open, $ticket->status);
        $this->assertSame(1, $ticket->messages()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.support_ticket_created']);
    }

    public function test_reply_and_internal_note_are_recorded(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $this->actingAs($admin)->post('/platform/support', [
            'tenant_id' => $tenant->id,
            'subject' => 'Billing question',
            'body' => 'Why was I charged twice?',
        ]);
        $ticket = SupportTicket::firstOrFail();

        $this->actingAs($admin)->post("/platform/support/{$ticket->id}/reply", [
            'body' => 'Looking into it now.',
            'internal' => false,
        ])->assertRedirect();

        $this->actingAs($admin)->post("/platform/support/{$ticket->id}/reply", [
            'body' => 'Internal: check gateway logs.',
            'internal' => true,
        ])->assertRedirect();

        $this->assertSame(3, $ticket->messages()->count());
        $this->assertSame(1, $ticket->messages()->where('is_internal', true)->count());
    }

    public function test_ticket_status_can_be_resolved(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $this->actingAs($admin)->post('/platform/support', [
            'tenant_id' => $tenant->id,
            'subject' => 'Refund request',
            'body' => 'Please refund.',
        ]);
        $ticket = SupportTicket::firstOrFail();

        $this->actingAs($admin)->post("/platform/support/{$ticket->id}/status", ['status' => 'resolved'])->assertRedirect();

        $ticket->refresh();
        $this->assertSame(TicketStatus::Resolved, $ticket->status);
        $this->assertNotNull($ticket->resolved_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.support_ticket_status_changed']);
    }

    public function test_support_index_and_show_render(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $this->actingAs($admin)->post('/platform/support', [
            'tenant_id' => $tenant->id,
            'subject' => 'Rendering check',
            'body' => 'Body',
        ]);
        $ticket = SupportTicket::firstOrFail();

        $this->actingAs($admin)->get('/platform/support')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Support/Index')->has('tickets.data')->has('tenants'));

        $this->actingAs($admin)->get("/platform/support/{$ticket->id}")->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Support/Show')->has('ticket.messages'));
    }

    public function test_auditor_can_view_but_not_manage_tickets(): void
    {
        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::PlatformAuditor);
        $tenant = Tenant::factory()->create();

        $this->actingAs($auditor)->get('/platform/support')->assertOk();

        $this->actingAs($auditor)->post('/platform/support', [
            'tenant_id' => $tenant->id,
            'subject' => 'x',
            'body' => 'y',
        ])->assertForbidden();
    }
}
