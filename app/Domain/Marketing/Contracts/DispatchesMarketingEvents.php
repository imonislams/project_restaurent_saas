<?php

namespace App\Domain\Marketing\Contracts;

use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * Implemented only by providers that receive server-side events (the Meta
 * Conversions API, the GA4 Measurement Protocol, and later an ESP).
 */
interface DispatchesMarketingEvents
{
    /**
     * Deliver one event. Implementations must return `skipped` (rather than
     * sending) when the visitor has not granted advertising consent.
     *
     * @return array{
     *     ok: bool,
     *     skipped?: bool,
     *     reason?: ?string,
     *     http_status?: ?int,
     *     response?: ?string,
     *     error?: ?string
     * }
     */
    public function dispatchEvent(MarketingIntegration $integration, MarketingEvent $event): array;
}
