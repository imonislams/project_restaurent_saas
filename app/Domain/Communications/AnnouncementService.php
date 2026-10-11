<?php

namespace App\Domain\Communications;

use App\Domain\Communications\Models\Announcement;
use App\Domain\Tenancy\Models\Tenant;

class AnnouncementService
{
    /** @return list<array{id: int, title: string, body: string, level: string}> */
    public function forTenant(Tenant $tenant): array
    {
        return Announcement::query()
            ->where('is_active', true)
            ->latest('id')
            ->get()
            ->filter(fn (Announcement $announcement) => $announcement->isLive() && $this->matches($announcement, $tenant))
            ->map(fn (Announcement $announcement) => [
                'id' => $announcement->getKey(),
                'title' => $announcement->title,
                'body' => $announcement->body,
                'level' => $announcement->level,
            ])
            ->values()
            ->all();
    }

    protected function matches(Announcement $announcement, Tenant $tenant): bool
    {
        $audience = $announcement->audience ?? [];

        if (! empty($audience['status']) && $audience['status'] !== $tenant->status->value) {
            return false;
        }

        if (! empty($audience['plan'])) {
            $slug = $tenant->subscription?->plan?->slug;

            if ($slug !== $audience['plan']) {
                return false;
            }
        }

        return true;
    }
}
