<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Enums\BillRequestStatus;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Dining\Models\BillRequest;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lifecycle of a dining session: one active session per table, joined by one
 * or more participants (devices). Enforces the tenant's guest/identity policy
 * and the configured session timeout server-side.
 */
class DiningSessionService
{
    public function __construct(protected QrDiningSettings $settings) {}

    public function activeForTable(Table $table): ?DiningSession
    {
        return $table->diningSessions()
            ->whereIn('status', [
                DiningSessionStatus::Open->value,
                DiningSessionStatus::BillRequested->value,
                DiningSessionStatus::Settling->value,
            ])
            ->latest('id')
            ->first();
    }

    /**
     * Start a session for the table or join the existing active one.
     *
     * @param  array{name?: ?string, phone?: ?string, email?: ?string, marketing_consent?: bool, loyalty_consent?: bool}  $identity
     * @return array{session: DiningSession, participant: DiningParticipant}
     */
    public function startOrJoin(TableQrToken $qr, array $identity = []): array
    {
        $this->assertIdentityAllowed($identity);

        $table = Table::query()->findOrFail($qr->table_id);
        $session = $this->activeForTable($table);

        if ($session && $session->isExpired()) {
            $this->expire($session);
            $session = null;
        }

        if (! $session) {
            $session = $this->create($qr);
            $this->record($session, 'session.started', 'system');
        }

        $participant = $this->addParticipant($session, $identity);
        $this->touch($session);

        return ['session' => $session->fresh(), 'participant' => $participant];
    }

    /**
     * @param  array{name?: ?string, phone?: ?string, email?: ?string, marketing_consent?: bool, loyalty_consent?: bool}  $identity
     */
    public function addParticipant(DiningSession $session, array $identity): DiningParticipant
    {
        return $session->participants()->create([
            'tenant_id' => $session->tenant_id,
            'display_name' => $identity['name'] ?? null,
            'phone' => $identity['phone'] ?? null,
            'email' => $identity['email'] ?? null,
            'participant_token' => Str::random(64),
            'is_lead' => $session->participants()->count() === 0,
            'marketing_consent' => (bool) ($identity['marketing_consent'] ?? false),
            'loyalty_consent' => (bool) ($identity['loyalty_consent'] ?? false),
            'joined_at' => now(),
            'last_seen_at' => now(),
        ]);
    }

    public function touch(DiningSession $session): void
    {
        $session->forceFill(['last_activity_at' => now()])->save();
    }

    public function expire(DiningSession $session): void
    {
        $session->forceFill([
            'status' => DiningSessionStatus::Expired,
            'closed_at' => $session->closed_at ?? now(),
            'close_reason' => 'expired',
        ])->save();

        $this->record($session, 'session.expired', 'system');
    }

    public function close(DiningSession $session, string $reason = 'closed', ?User $by = null): DiningSession
    {
        $session->forceFill([
            'status' => DiningSessionStatus::Closed,
            'closed_at' => now(),
            'closed_by' => $by?->getKey(),
            'close_reason' => $reason,
        ])->save();

        $this->record($session, 'session.closed', $by ? 'staff' : 'system', ['reason' => $reason], $by?->getKey());

        return $session;
    }

    /**
     * Customer asks for the bill. Idempotent — a second request while one is
     * open returns the existing one instead of duplicating it.
     */
    public function requestBill(DiningSession $session, ?DiningParticipant $participant): BillRequest
    {
        $existing = $session->billRequests()
            ->whereIn('status', [BillRequestStatus::Pending->value, BillRequestStatus::InProgress->value])
            ->latest('id')
            ->first();

        if ($existing) {
            return $existing;
        }

        $outstanding = (float) $session->orders()
            ->whereNotIn('status', [OrderStatus::Voided->value])
            ->selectRaw('COALESCE(SUM(total - paid_total), 0) as due')
            ->value('due');

        $invoice = app(\App\Domain\Invoicing\OrderInvoiceService::class)->openInvoiceForSession($session);

        $request = $session->billRequests()->create([
            'tenant_id' => $session->tenant_id,
            'invoice_id' => $invoice?->getKey(),
            'requested_by_participant_id' => $participant?->getKey(),
            'status' => BillRequestStatus::Pending,
            'payable_total' => round(max(0.0, $outstanding), 2),
            'requested_at' => now(),
        ]);

        if ($session->status === DiningSessionStatus::Open) {
            $session->forceFill(['status' => DiningSessionStatus::BillRequested])->save();
        }

        $this->record($session, 'bill.requested', 'participant', [], $participant?->getKey());

        // Notify the branch's billing staff once, on the newly created request.
        try {
            app(\App\Domain\Notifications\NotificationService::class)->billRequested($request);
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            app(\App\Domain\Realtime\RealtimeBroadcaster::class)->send(new \App\Domain\Realtime\Events\TenantAlert(
                $session->tenant_id,
                'billing',
                'Bill requested',
                'Table '.($session->table?->name ?? '—').' asked for the bill.',
                'warning',
                $session->branch_id,
            ), 'billing');
        } catch (\Throwable $e) {
            report($e);
        }

        return $request;
    }

    /**
     * Close the session once every order is settled and fully paid. Called after
     * a staff settlement or a verified online payment.
     */
    public function maybeCloseAfterSettlement(DiningSession $session): bool
    {
        if ($session->isClosed()) {
            return false;
        }

        $hasOpen = $session->orders()
            ->whereNotIn('status', [OrderStatus::Completed->value, OrderStatus::Voided->value])
            ->exists();

        if ($hasOpen) {
            return false;
        }

        $unpaid = $session->orders()
            ->where('status', OrderStatus::Completed->value)
            ->whereColumn('paid_total', '<', 'total')
            ->exists();

        if ($unpaid) {
            return false;
        }

        $session->billRequests()
            ->whereIn('status', [BillRequestStatus::Pending->value, BillRequestStatus::InProgress->value])
            ->update(['status' => BillRequestStatus::Settled->value, 'settled_at' => now()]);

        $session->forceFill(['settled_at' => now()])->save();

        $this->close($session, 'settled');

        return true;
    }

    public function resolveByToken(?string $token): ?DiningSession
    {
        if (blank($token)) {
            return null;
        }

        return DiningSession::query()->where('session_token', $token)->first();
    }

    public function record(DiningSession $session, string $type, string $actorType = 'system', array $payload = [], ?int $actorId = null): void
    {
        $session->events()->create([
            'tenant_id' => $session->tenant_id,
            'type' => $type,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'payload' => $payload ?: null,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array{phone?: ?string, email?: ?string}  $identity
     */
    protected function assertIdentityAllowed(array $identity): void
    {
        if ($this->settings->requirePhone() && blank($identity['phone'] ?? null)) {
            throw ValidationException::withMessages(['phone' => 'A phone number is required to order.']);
        }

        if ($this->settings->requireEmail() && blank($identity['email'] ?? null)) {
            throw ValidationException::withMessages(['email' => 'An email address is required to order.']);
        }
    }

    protected function create(TableQrToken $qr): DiningSession
    {
        return DiningSession::create([
            'tenant_id' => $qr->tenant_id,
            'branch_id' => $qr->branch_id,
            'table_id' => $qr->table_id,
            'session_token' => Str::random(64),
            'status' => DiningSessionStatus::Open,
            'billing_mode' => $this->settings->billingMode(),
            'started_at' => now(),
            'last_activity_at' => now(),
            'expires_at' => now()->addMinutes($this->settings->sessionTimeoutMinutes()),
        ]);
    }
}
