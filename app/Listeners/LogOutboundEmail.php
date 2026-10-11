<?php

namespace App\Listeners;

use App\Domain\Communications\EmailLogger;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Mail\Events\MessageSendingFailed;

/**
 * Records every outbound email (sent or failed) for the email operations center.
 */
class LogOutboundEmail
{
    public function __construct(protected EmailLogger $logger) {}

    public function sent(MessageSent $event): void
    {
        $this->logger->sent($event->message, $event->data ?? null);
    }

    public function failed(MessageSendingFailed $event): void
    {
        $this->logger->failed($event->message, $event->exception, $event->data ?? null);
    }
}
