<?php

use App\Domain\Realtime\ChannelAccess;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
| Real-time channel authorisation.
|
| Private channels only: each one maps to the permission that already gates the
| screen it feeds, so a socket can never surface more than the page it belongs
| to. The diner's QR tracking channel is public and keyed by the unguessable
| token already in the URL, so it needs no callback here.
*/

Broadcast::channel('App.Models.User.{userId}', fn (User $user, int $userId) => (int) $user->id === $userId);

foreach (ChannelAccess::TENANT as $area => $permission) {
    Broadcast::channel(
        "tenant.{tenantId}.{$area}",
        fn (User $user, int $tenantId) => ChannelAccess::tenant($user, $tenantId, $permission),
    );
}

foreach (ChannelAccess::PLATFORM as $area => $permission) {
    Broadcast::channel(
        "platform.{$area}",
        fn (User $user) => ChannelAccess::platform($user, $permission),
    );
}
