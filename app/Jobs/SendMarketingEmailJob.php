<?php

namespace App\Jobs;

use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\Models\MarketingEmailSend;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Delivers one recipient's copy of a campaign.
 *
 * Dispatched on the synchronous connection so a campaign is delivered whether or
 * not a queue worker is running. Suppression, subscriber status and consent are
 * re-checked by the service at send time, so an unsubscribe is still honoured.
 */
class SendMarketingEmailJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60, 300];

    public function __construct(public int $sendId)
    {
        $this->onQueue('marketing');
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
