<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Communications\Sms\SmsManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform administrator configuration of the outbound SMS provider used for
 * mobile verification. One provider is active at a time; its credentials are
 * stored encrypted and never returned to the frontend.
 */
class SmsController extends Controller
{
    public function __construct(
        protected SmsManager $sms,
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Sms/Index', [
            'driver' => $this->sms->activeDriver(),
            'providers' => collect($this->sms->schema())->map(fn (array $provider, string $key) => [
                'value' => $key,
                'label' => $provider['label'],
                'fields' => $provider['fields'],
                'credential_keys' => $this->sms->credentialKeys($key),
                'configured' => $this->sms->isConfigured($key),
            ])->values(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'driver' => ['required', Rule::in($this->sms->providers())],
            'credentials' => ['nullable', 'array'],
        ]);

        $this->sms->setDriver($data['driver']);

        if (! empty($data['credentials']) && is_array($data['credentials'])) {
            $this->sms->setCredentials($data['driver'], $data['credentials']);
        }

        $this->audit->log('platform.sms_updated', null, ['driver' => $data['driver']], $request->user());

        return back()->with('success', 'SMS provider saved.');
    }

    public function test(Request $request): RedirectResponse
    {
        $data = $request->validate(['to' => ['required', 'string', 'max:32']]);

        $result = $this->sms->send($data['to'], 'Test message from '.config('app.name').'.');

        $this->audit->log('platform.sms_tested', null, ['to' => $data['to'], 'ok' => $result['ok']], $request->user());

        return back()->with(
            $result['ok'] ? 'success' : 'error',
            $result['ok'] ? 'Test message sent via '.$this->sms->activeDriver().'.' : 'Send failed: '.($result['error'] ?? 'unknown error'),
        );
    }
}
