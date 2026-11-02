<?php

namespace App\Jobs;

use App\Domain\Marketing\Contracts\DispatchesMarketingEvents;
use App\Domain\Marketing\MarketingEventService;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Domain\Marketing\MarketingProviderManager;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingEventDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Delivers one event to one provider.
 *
 * Three properties matter here:
 *
 *  1. **Dedupe** — a row keyed on (provider, external_event_id) is created first, so
 *     a replayed job cannot send the same event twice.
 *  2. **Consent at send time** — the check happens here rather than when the event
 *     was recorded, so withdrawing consent stops in-flight delivery.
 *  3. **Honest retries** — a rate limit or a server error is retried with backoff;
 *     a client error is terminal and recorded as such instead of retried forever.
 */
class DispatchMarketingEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60, 300];

    public function __construct(
        public int $eventId,
        public string $provider,
    ) {}

    public function handle(
        MarketingIntegrationService $integrations,
        MarketingProviderManager $providers,
        MarketingEventService $events,
    ): void {
        $event = MarketingEvent::query()->find($this->eventId);
        $integration = $integrations->forProvider($this->provider);

        if ($event === null || $integration === null) {
            return;
        }

        $delivery = MarketingEventDelivery::query()->firstOrCreate(
            ['provider' => $this->provider, 'external_event_id' => $event->event_id],
            ['marketing_event_id' => $event->getKey(), 'status' => 'pending'],
        );

        if ($delivery->status === 'sent') {
            return;
        }

        // Only a verified, switched-on integration may send anything.
        if (! $integration->isOperational()) {
            $this->finish($delivery, 'skipped', [
                'error' => 'The '.$this->provider.' integration is not enabled and verified, so nothing was sent.',
            ]);

            return;
        }

        // Consent is re-checked at dispatch time, not at record time.
        if (! $events->mayDispatch($event)) {
            $this->finish($delivery, 'skipped', [
                'error' => 'The visitor has not granted advertising consent for this event.',
            ]);

            return;
        }

        $driver = $providers->driver($this->provider);

        if (! $driver instanceof DispatchesMarketingEvents) {
            $this->finish($delivery, 'failed', [
                'error' => 'The '.$this->provider.' driver cannot dispatch events.',
            ]);

            return;
        }

        $result = $driver->dispatchEvent($integration, $event);
        $delivery->attempts = $delivery->attempts + 1;

        if ($result['ok'] ?? false) {
            $this->finish($delivery, 'sent', [
                'http_status' => $result['http_status'] ?? null,
                'response' => $result['response'] ?? null,
                'error' => null,
                'sent_at' => Carbon::now(),
            ]);

            $integrations->recordSync($this->provider, 'event_dispatch', [
                'ok' => true,
                'items' => 1,
                'direction' => 'push',
                'meta' => ['event' => $event->name->value],
            ]);

            return;
        }

        if ($result['skipped'] ?? false) {
            $this->finish($delivery, 'skipped', ['error' => $result['reason'] ?? 'The provider skipped this event.']);

            return;
        }

        $error = $result['error'] ?? 'The provider rejected the event.';
        $status = $result['http_status'] ?? null;

        if ($this->isRetryable($status)) {
            $delivery->next_retry_at = Carbon::now()->addSeconds($this->nextBackoff());
            $delivery->http_status = $status;
            $delivery->error = $error;
            $delivery->save();

            // Rethrow so the queue applies its own backoff and tries limit.
            throw new RuntimeException('Marketing event delivery to '.$this->provider.' failed: '.$error);
        }

        $this->finish($delivery, 'failed', [
            'http_status' => $status,
            'response' => $result['response'] ?? null,
            'error' => $error,
        ]);
    }

    /**
     * The queue has given up. Record it rather than leaving a row pending forever.
     */
    public function failed(?\Throwable $exception): void
    {
        $event = MarketingEvent::query()->find($this->eventId);

        if ($event === null) {
            return;
        }

        $delivery = MarketingEventDelivery::query()
            ->where('provider', $this->provider)
            ->where('external_event_id', $event->event_id)
            ->first();

        if ($delivery === null || $delivery->status === 'sent') {
            return;
        }

        $this->finish($delivery, 'failed', [
            'error' => $delivery->error ?? ($exception?->getMessage() ?? 'Delivery attempts exhausted.'),
        ]);
    }

    /**
     * A rate limit, a server error or a transport failure is worth retrying; any
     * other client error will fail identically however many times it is sent.
     */
    protected function isRetryable(?int $httpStatus): bool
    {
        if ($httpStatus === null) {
            return true;
        }

        return $httpStatus === 429 || $httpStatus >= 500;
    }

    protected function nextBackoff(): int
    {
        return $this->backoff[min($this->attempts() - 1, count($this->backoff) - 1)] ?? 60;
    }

    /** @param array<string, mixed> $attributes */
    protected function finish(MarketingEventDelivery $delivery, string $status, array $attributes): void
    {
        $delivery->forceFill(array_merge(['status' => $status, 'next_retry_at' => null], $attributes))->save();
    }
}
