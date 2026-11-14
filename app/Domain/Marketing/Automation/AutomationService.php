<?php

namespace App\Domain\Marketing\Automation;

use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\Enums\AutomationTrigger;
use App\Domain\Marketing\Enums\StepType;
use App\Domain\Marketing\Models\MarketingAutomation;
use App\Domain\Marketing\Models\MarketingAutomationEnrollment;
use App\Domain\Marketing\Models\MarketingAutomationLog;
use App\Domain\Marketing\Models\MarketingAutomationStep;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Automation workflows: trigger, ordered steps, enrolments and a per-step log.
 *
 * Idempotency is structural: `marketing_automation_logs` is unique on
 * (enrolment, step, attempts), so replaying a step writes a new attempt or collides —
 * it never produces a second email. Every email step re-uses the same send-time gates
 * as a campaign (suppression, status, consent).
 */
class AutomationService
{
    public function __construct(protected EmailMarketingService $emails) {}

    /**
     * Create the built-in sequences once. Safe to call repeatedly.
     *
     * @return int how many were created
     */
    public function seedPresets(): int
    {
        $created = 0;

        foreach ($this->presets() as $preset) {
            $automation = MarketingAutomation::query()->firstOrCreate(
                ['key' => $preset['key']],
                [
                    'name' => $preset['name'],
                    'description' => $preset['description'],
                    'trigger_type' => $preset['trigger'],
                    'status' => 'draft',
                    'is_system' => true,
                ],
            );

            if ($automation->wasRecentlyCreated) {
                foreach ($preset['steps'] as $index => $step) {
                    MarketingAutomationStep::create([
                        'automation_id' => $automation->getKey(),
                        'sort_order' => $index,
                        'type' => $step['type'],
                        'template_key' => $step['template'] ?? null,
                        'delay_value' => $step['delay'] ?? null,
                        'delay_unit' => isset($step['delay']) ? 'days' : null,
                        'config' => ['note' => $step['note'] ?? null],
                    ]);
                }

                $created++;
            }
        }

        return $created;
    }

    /**
     * Enrol a subject in every active workflow for this trigger.
     *
     * @return int how many enrolments were created
     */
    public function enrol(AutomationTrigger $trigger, string $subjectType, int $subjectId): int
    {
        $created = 0;

        $automations = MarketingAutomation::query()
            ->active()
            ->forTrigger($trigger)
            ->get();

        foreach ($automations as $automation) {
            $enrollment = MarketingAutomationEnrollment::query()->firstOrCreate(
                [
                    'automation_id' => $automation->getKey(),
                    'subject_type' => $subjectType,
                    'subject_id' => $subjectId,
                ],
                [
                    'status' => 'active',
                    'current_step' => 0,
                    'enrolled_at' => Carbon::now(),
                    'next_run_at' => Carbon::now(),
                ],
            );

            if ($enrollment->wasRecentlyCreated) {
                $created++;
            }
        }

        return $created;
    }

    /**
     * Advance every due enrolment by at most one step.
     *
     * @return array{processed: int, sent: int, skipped: int}
     */
    public function run(int $limit = 200): array
    {
        $processed = 0;
        $sent = 0;
        $skipped = 0;

        $due = MarketingAutomationEnrollment::query()->due()->limit($limit)->get();

        foreach ($due as $enrollment) {
            $processed++;
            $result = $this->advance($enrollment);

            $sent += $result === 'sent' ? 1 : 0;
            $skipped += $result === 'skipped' ? 1 : 0;
        }

        return ['processed' => $processed, 'sent' => $sent, 'skipped' => $skipped];
    }

    /**
     * Execute the current step for one enrolment.
     *
     * @return string sent|skipped|waiting|completed|failed
     */
    public function advance(MarketingAutomationEnrollment $enrollment): string
    {
        $automation = $enrollment->automation;

        if ($automation === null || $enrollment->status !== 'active') {
            return 'skipped';
        }

        $steps = $automation->steps()->get();
        $index = $enrollment->current_step;

        if (! isset($steps[$index])) {
            $enrollment->forceFill([
                'status' => 'completed',
                'completed_at' => Carbon::now(),
                'next_run_at' => null,
            ])->save();

            $automation->forceFill([
                'last_run_at' => Carbon::now(),
                'run_count' => $automation->run_count + 1,
            ])->save();

            return 'completed';
        }

        $step = $steps[$index];

        // One execution per (enrolment, step), ever. A replayed step finds this row
        // and returns without doing anything, which is what makes a retry safe.
        $log = MarketingAutomationLog::query()->firstOrCreate(
            ['enrollment_id' => $enrollment->getKey(), 'step_id' => $step->getKey()],
            ['status' => 'ok', 'attempts' => 1, 'executed_at' => Carbon::now()],
        );

        if (! $log->wasRecentlyCreated) {
            return 'skipped';
        }

        $message = null;

        if ($step->type === StepType::Email) {
            $recipient = $this->recipientFor($enrollment);

            if ($recipient === null) {
                $log->forceFill(['status' => 'skipped', 'message' => 'No address on the subject.'])->save();

                return 'skipped';
            }

            $gate = $this->emails->mayEmail($recipient);

            if (! $gate['ok']) {
                $log->forceFill(['status' => 'skipped', 'message' => $gate['reason']])->save();
                $enrollment->forceFill(['status' => 'stopped', 'stopped_at' => Carbon::now(), 'stop_reason' => $gate['reason']])->save();

                return 'skipped';
            }

            $html = $this->renderStep($step, $recipient, $automation);

            try {
                Mail::html($html, function ($message) use ($recipient, $step, $automation) {
                    $message->to($recipient)->subject($automation->name.($step->template_key ? ' — '.$step->template_key : ''));
                });

                $message = 'Email sent.';
            } catch (\Throwable $e) {
                $log->forceFill(['status' => 'failed', 'message' => mb_substr($e->getMessage(), 0, 2000)])->save();

                return 'failed';
            }
        }

        $log->forceFill(['message' => $message, 'next_run_at' => Carbon::now()->addSeconds($step->delaySeconds())])->save();

        $nextRun = Carbon::now()->addSeconds($step->delaySeconds());

        $enrollment->forceFill([
            'current_step' => $index + 1,
            'next_run_at' => $nextRun,
        ])->save();

        return 'sent';
    }

    /** @return array{key: string, name: string, description: string, trigger: string, steps: list<array<string, mixed>>}[] */
    public function presets(): array
    {
        $email = fn (string $note, ?int $delay = null) => ['type' => StepType::Email->value, 'note' => $note, 'delay' => $delay];

        return [
            ['key' => 'lead_welcome', 'name' => 'New lead welcome', 'description' => 'Acknowledge an enquiry straight away.', 'trigger' => AutomationTrigger::LeadCreated->value, 'steps' => [$email('Welcome and what happens next')]],
            ['key' => 'demo_confirmation', 'name' => 'Demo request confirmation', 'description' => 'Confirm a demo request and set expectations.', 'trigger' => AutomationTrigger::DemoRequested->value, 'steps' => [$email('Demo confirmation')]],
            ['key' => 'incomplete_registration', 'name' => 'Incomplete registration follow-up', 'description' => 'Nudge someone who started signing up.', 'trigger' => AutomationTrigger::RegistrationIncomplete->value, 'steps' => [$email('Finish setting up', 1), $email('Second nudge', 2), $email('Final nudge', 4)]],
            ['key' => 'new_restaurant_welcome', 'name' => 'New restaurant welcome', 'description' => 'Welcome a restaurant that just registered.', 'trigger' => AutomationTrigger::TenantCreated->value, 'steps' => [$email('Welcome to the platform')]],
            ['key' => 'trial_onboarding', 'name' => 'Trial onboarding', 'description' => 'Help a new trial get to their first sale.', 'trigger' => AutomationTrigger::TrialStarted->value, 'steps' => [$email('Day 1: set up your menu', 1), $email('Day 3: open a table', 2)]],
            ['key' => 'trial_feature_education', 'name' => 'Trial feature education', 'description' => 'Show one feature per message during the trial.', 'trigger' => AutomationTrigger::TrialStarted->value, 'steps' => [$email('Inventory basics', 5), $email('Reports basics', 7)]],
            ['key' => 'trial_expiry', 'name' => 'Trial expiry reminder', 'description' => 'Remind before a trial ends.', 'trigger' => AutomationTrigger::TrialEnding->value, 'steps' => [$email('Your trial ends soon')]],
            ['key' => 'payment_reminder', 'name' => 'Subscription payment reminder', 'description' => 'Chase an unpaid invoice.', 'trigger' => AutomationTrigger::InvoiceUnpaid->value, 'steps' => [$email('Invoice reminder', 2), $email('Second reminder', 5)]],
            ['key' => 'renewal_reminder', 'name' => 'Subscription renewal reminder', 'description' => 'Remind before a renewal is charged.', 'trigger' => AutomationTrigger::PeriodEnding->value, 'steps' => [$email('Renewal reminder')]],
            ['key' => 'failed_payment_recovery', 'name' => 'Failed payment recovery', 'description' => 'Recover a failed payment before it lapses.', 'trigger' => AutomationTrigger::PaymentFailed->value, 'steps' => [$email('Payment failed', 1), $email('Still failing', 3)]],
            ['key' => 'cancellation_followup', 'name' => 'Cancellation follow-up', 'description' => 'Ask why, without pressure.', 'trigger' => AutomationTrigger::SubscriptionCancelled->value, 'steps' => [$email('Sorry to see you go', 1)]],
            ['key' => 'win_back', 'name' => 'Win-back campaign', 'description' => 'Reach out to a restaurant that cancelled.', 'trigger' => AutomationTrigger::SubscriptionCancelled->value, 'steps' => [$email('Would you come back?', 30)]],
            ['key' => 'inactive_reengagement', 'name' => 'Inactive restaurant re-engagement', 'description' => 'Offer help to a quiet account.', 'trigger' => AutomationTrigger::InactiveTenant->value, 'steps' => [$email('Need a hand?', 14)]],
            ['key' => 'upgrade_promotion', 'name' => 'Upgrade promotion', 'description' => 'Suggest the next plan when usage nears a limit.', 'trigger' => AutomationTrigger::UsageThreshold->value, 'steps' => [$email('You are close to your limit')]],
        ];
    }

    protected function recipientFor(MarketingAutomationEnrollment $enrollment): ?string
    {
        if ($enrollment->subject_type === MarketingLead::class) {
            return MarketingLead::query()->find($enrollment->subject_id)?->email;
        }

        if ($enrollment->subject_type === Tenant::class) {
            $tenant = Tenant::query()->find($enrollment->subject_id);

            // The billing address is the canonical one; otherwise the first user on
            // the account, which is the owner created at registration.
            return $tenant?->business_email
                ?? $tenant?->users()->orderBy('id')->value('email');
        }

        return null;
    }

    protected function renderStep(MarketingAutomationStep $step, string $recipient, MarketingAutomation $automation): string
    {
        $body = (string) ($step->config['body'] ?? '');

        if ($body === '') {
            $body = '<p>'.e($automation->description ?? $automation->name).'</p>';
        }

        return $body;
    }
}
