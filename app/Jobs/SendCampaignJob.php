<?php

namespace App\Jobs;

use App\Domain\Communications\CampaignService;
use App\Domain\Communications\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $campaignId) {}

    public function handle(CampaignService $campaigns): void
    {
        $campaign = Campaign::query()->find($this->campaignId);

        if ($campaign) {
            $campaigns->send($campaign);
        }
    }
}
