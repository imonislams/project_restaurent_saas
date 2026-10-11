<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Communications\Models\EmailLog;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class EmailController extends Controller
{
    public function __construct(
        protected PlatformSettings $settings,
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Email/Dashboard', [
            'stats' => [
                'total' => EmailLog::query()->count(),
                'sent' => EmailLog::query()->where('status', 'sent')->count(),
                'failed' => EmailLog::query()->where('status', 'failed')->count(),
                'retryable' => EmailLog::query()->where('status', 'failed')->whereNotNull('retry_class')->count(),
                'last_24h' => EmailLog::query()->where('created_at', '>=', now()->subDay())->count(),
            ],
            'recent' => EmailLog::query()->latest('id')->limit(10)->get()->map(fn (EmailLog $log) => $this->row($log)),
            'provider' => $this->providerSummary(),
        ]);
    }

    public function logs(Request $request): Response
    {
        return $this->listing($request, null);
    }

    public function failed(Request $request): Response
    {
        return $this->listing($request, 'failed');
    }

    protected function listing(Request $request, ?string $forcedStatus): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $forcedStatus ?? $request->string('status')->toString(),
        ];

        return Inertia::render('Platform/Email/Logs', [
            'logs' => EmailLog::query()
                ->when($filters['search'] !== '', fn ($q) => $q->where('to_email', 'like', '%'.$filters['search'].'%')->orWhere('subject', 'like', '%'.$filters['search'].'%'))
                ->when($filters['status'] !== '', fn ($q) => $q->where('status', $filters['status']))
                ->latest('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (EmailLog $log) => $this->row($log)),
            'filters' => $filters,
            'title' => $forcedStatus === 'failed' ? 'Failed Emails' : 'Email Logs',
        ]);
    }

    public function retry(EmailLog $log): RedirectResponse
    {
        abort_unless($log->isRetryable(), 422, 'This message cannot be retried automatically.');

        $class = $log->retry_class;
        $mailable = $class::fromRetryPayload($log->retry_payload ?? []);

        Mail::to($log->to_email)->queue($mailable);

        $this->audit->log('platform.email_retried', $log, ['to' => $log->to_email], request()->user(), $log->tenant_id);

        return back()->with('success', 'Retry queued.');
    }

    public function settings(): Response
    {
        return Inertia::render('Platform/Email/Settings', [
            'settings' => $this->maskedSettings(),
            'mailers' => ['smtp', 'log', 'array', 'sendmail'],
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'mailer' => ['required', 'string', 'max:20'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'encryption' => ['nullable', 'string', 'max:20'],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        foreach (['mailer', 'host', 'port', 'username', 'encryption', 'from_address', 'from_name'] as $key) {
            $this->settings->set('mail.'.$key, $data[$key] ?? null, 'mail');
        }

        // Only overwrite the password when a new one is supplied.
        if (! empty($data['password'])) {
            $this->settings->set('mail.password', $data['password'], 'mail', encrypted: true);
        }

        $this->audit->log('platform.email_settings_updated', null, ['mailer' => $data['mailer']], $request->user());

        return back()->with('success', 'Email settings saved.');
    }

    public function testEmail(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);

        try {
            Mail::raw('This is a test email from the platform control center.', function ($message) use ($data) {
                $message->to($data['email'])->subject('Test email');
            });

            $this->audit->log('platform.email_test_sent', null, ['to' => $data['email']], $request->user());

            return back()->with('success', 'Test email sent to '.$data['email'].'.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Send failed: '.$e->getMessage());
        }
    }

    /** @return array<string, mixed> */
    protected function row(EmailLog $log): array
    {
        return [
            'id' => $log->getKey(),
            'to' => $log->to_email,
            'subject' => $log->subject,
            'status' => $log->status,
            'mailer' => $log->mailer,
            'attempts' => $log->attempts,
            'error' => $log->error,
            'retryable' => $log->isRetryable(),
            'sent_at' => $log->sent_at?->toIso8601String(),
            'failed_at' => $log->failed_at?->toIso8601String(),
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    protected function providerSummary(): array
    {
        $settings = $this->settings->group('mail');

        return [
            'mailer' => $settings['mail.mailer'] ?? config('mail.default'),
            'from_address' => $settings['mail.from_address'] ?? config('mail.from.address'),
            'configured' => ($settings['mail.mailer'] ?? null) !== null,
            'host' => $settings['mail.host'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    protected function maskedSettings(): array
    {
        $settings = $this->settings->group('mail');

        return [
            'mailer' => $settings['mail.mailer'] ?? config('mail.default'),
            'host' => $settings['mail.host'] ?? '',
            'port' => $settings['mail.port'] ?? '',
            'username' => $settings['mail.username'] ?? '',
            'encryption' => $settings['mail.encryption'] ?? '',
            'from_address' => $settings['mail.from_address'] ?? config('mail.from.address'),
            'from_name' => $settings['mail.from_name'] ?? config('mail.from.name'),
            'has_password' => ! empty($settings['mail.password']),
        ];
    }
}
