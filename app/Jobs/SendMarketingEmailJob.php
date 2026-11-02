<?php

namespace App\Jobs;

use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\Models\MarketingEmailSend;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;

/**
 * Delivers one recipient's copy of a campaign.
 *
 * One job per recipient keeps a large send bounded: a failure retries (or fails) that
 * address only, and rate limiting protects the mail transport from a sudden burst.
 * Suppression, subscriber status and consent are re-checked by the service at send
 * time, so an unsubscribe that lands after queueing still takes effect.
 */
class SendMarketingEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60, 300];

    public function __construct(public int $sendId)
    {
        $this->onQueue('marketing');
    }

    public function middleware(): array
    {
        return [new RateLimited('marketing-email')];
    }

    public function handle(EmailMarketingService $emails): void
    {
        $send = MarketingEmailSend::query()->find($this->sendId);

        if ($send === null) {
            return;
        }

        $emails->send($send);
    }
}
