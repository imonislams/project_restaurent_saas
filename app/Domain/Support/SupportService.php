<?php

namespace App\Domain\Support;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Support\Enums\TicketPriority;
use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Models\SupportTicket;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Platform-side support ticketing. Every state change is audited with the
 * acting operator and the owning tenant.
 */
class SupportService
{
    public function __construct(protected AuditLogger $audit) {}

    /**
     * @param  array{subject: string, body: string, priority?: string, assigned_to?: ?int}  $data
     */
    public function create(Tenant $tenant, array $data, User $actor): SupportTicket
    {
        return DB::transaction(function () use ($tenant, $data, $actor) {
            $ticket = SupportTicket::create([
                'tenant_id' => $tenant->getKey(),
                'subject' => $data['subject'],
                'status' => TicketStatus::Open,
                'priority' => $data['priority'] ?? TicketPriority::Normal->value,
                'created_by' => $actor->getKey(),
                'assigned_to' => $data['assigned_to'] ?? null,
                'last_reply_at' => now(),
            ]);

            $ticket->messages()->create([
                'user_id' => $actor->getKey(),
                'body' => $data['body'],
                'is_internal' => false,
            ]);

            $this->audit->log('platform.support_ticket_created', $ticket, [
                'subject' => $ticket->subject,
            ], $actor, $tenant->getKey());

            return $ticket;
        });
    }

    public function reply(SupportTicket $ticket, string $body, bool $internal, User $actor): SupportTicket
    {
        $ticket->messages()->create([
            'user_id' => $actor->getKey(),
            'body' => $body,
            'is_internal' => $internal,
        ]);

        $ticket->forceFill(['last_reply_at' => now()])->save();

        $this->audit->log('platform.support_ticket_replied', $ticket, [
            'internal' => $internal,
        ], $actor, $ticket->tenant_id);

        return $ticket->fresh();
    }

    public function setStatus(SupportTicket $ticket, TicketStatus $status, User $actor): SupportTicket
    {
        $ticket->forceFill([
            'status' => $status,
            'resolved_at' => $status->isClosed() ? now() : null,
        ])->save();

        $this->audit->log('platform.support_ticket_status_changed', $ticket, [
            'status' => $status->value,
        ], $actor, $ticket->tenant_id);

        return $ticket->fresh();
    }

    public function assign(SupportTicket $ticket, ?int $userId, User $actor): SupportTicket
    {
        $ticket->forceFill(['assigned_to' => $userId])->save();

        $this->audit->log('platform.support_ticket_assigned', $ticket, [
            'assigned_to' => $userId,
        ], $actor, $ticket->tenant_id);

        return $ticket->fresh();
    }
}
