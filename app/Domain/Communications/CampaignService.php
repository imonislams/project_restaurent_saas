<?php

namespace App\Domain\Communications;

use App\Domain\Communications\Models\Campaign;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

/**
 * Resolves a campaign audience to recipient emails and delivers the campaign.
 */
class CampaignService
{
    /** @param array<string, mixed> $audience */
    public function audienceEmails(array $audience): array
    {
        $query = Tenant::query();

        if (! empty($audience['status'])) {
            $query->where('status', $audience['status']);
        }

        if (! empty($audience['plan'])) {
            $query->whereHas('subscription.plan', fn ($q) => $q->where('slug', $audience['plan']));
        }

        $tenantIds = $query->pluck('id');

        return User::query()
            ->whereIn('tenant_id', $tenantIds)
            ->whereHas('roles', fn ($q) => $q->where('slug', 'tenant_owner'))
            ->pluck('email')
            ->unique()
            ->values()
            ->all();
    }

    public function send(Campaign $campaign): int
    {
        $emails = $this->audienceEmails($campaign->audience ?? []);

        foreach ($emails as $email) {
            Mail::html($campaign->body, function ($message) use ($email, $campaign) {
                $message->to($email)->subject($campaign->subject);
            });
        }

        $campaign->forceFill([
            'status' => 'sent',
            'sent_at' => now(),
            'recipients_count' => count($emails),
        ])->save();

        return count($emails);
    }
}
