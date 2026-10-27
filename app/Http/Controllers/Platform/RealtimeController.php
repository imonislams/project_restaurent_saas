<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Realtime\Events\RealtimeTestEvent;
use App\Domain\Realtime\RealtimeManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform administrator configuration of the real-time (websocket) provider.
 *
 * One driver is active at a time — Reverb (self-hosted) or Pusher (cloud). Its
 * credentials are stored encrypted and never returned to the browser; only the
 * public connection values are shared.
 */
class RealtimeController extends Controller
{
    public function __construct(
        protected RealtimeManager $realtime,
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Realtime/Index', [
            'driver' => $this->realtime->activeDriver(),
            'active' => $this->realtime->enabled(),
            'drivers' => collect($this->realtime->schema())->map(fn (array $meta, string $key) => [
                'value' => $key,
                'label' => $meta['label'],
                'description' => $meta['description'],
                'fields' => $meta['fields'],
                'credential_keys' => $this->realtime->credentialKeys($key),
                'configured' => $this->realtime->isConfigured($key),
            ])->values(),
            'streams' => collect($this->realtime->streams())->map(fn (array $meta, string $key) => [
                'value' => $key,
                'label' => $meta['label'],
                'description' => $meta['description'],
                'enabled' => $this->realtime->streamEnabled($key),
            ])->values(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'driver' => ['required', Rule::in($this->realtime->drivers())],
            'credentials' => ['nullable', 'array'],
            'streams' => ['nullable', 'array'],
            'streams.*' => ['boolean'],
        ]);

        $this->realtime->setDriver($data['driver']);

        if (! empty($data['credentials']) && is_array($data['credentials'])) {
            $this->realtime->setCredentials($data['driver'], $data['credentials']);
        }

        foreach (array_keys($this->realtime->streams()) as $stream) {
            $this->realtime->setStream($stream, (bool) ($data['streams'][$stream] ?? false));
        }

        $this->audit->log('platform.realtime_updated', null, ['driver' => $data['driver']], $request->user());

        return back()->with('success', 'Real-time settings saved.');
    }

    public function test(Request $request): RedirectResponse
    {
        // Nothing is more misleading than "sent" when the driver is off: say so.
        if (! $this->realtime->enabled()) {
            return back()->with('error', 'Real-time is off, or the driver still needs its credentials. Nothing was sent.');
        }

        try {
            broadcast(new RealtimeTestEvent(
                $request->user()->getKey(),
                'Test event from '.config('app.name').'.',
                now()->toIso8601String(),
            ));
        } catch (\Throwable $e) {
            report($e);

            $this->audit->log('platform.realtime_tested', null, [
                'driver' => $this->realtime->activeDriver(),
                'ok' => false,
            ], $request->user());

            return back()->with('error', 'The driver rejected the test event: '.$e->getMessage());
        }

        $this->audit->log('platform.realtime_tested', null, [
            'driver' => $this->realtime->activeDriver(),
            'ok' => true,
        ], $request->user());

        return back()->with('success', 'Test event sent via '.$this->realtime->activeDriver().'.');
    }
}
