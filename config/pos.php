<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Offline POS
    |--------------------------------------------------------------------------
    |
    | How long a device may keep selling after it last reached the server. The
    | POS refuses to take new offline sales once this window has passed, so an
    | unattended terminal cannot keep trading indefinitely on a stale catalogue
    | and stale permissions. Set to 0 to disable the limit.
    |
    */

    'offline' => [
        'max_hours' => (int) env('POS_OFFLINE_MAX_HOURS', 12),
    ],

];
