<?php

namespace App\Http\Controllers;

use App\Support\AppVersion;
use App\Support\HealthChecker;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(HealthChecker $health, AppVersion $version): JsonResponse
    {
        $healthy = $health->healthy();

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'version' => $version->version(),
            'commit' => $version->commit(),
            'checks' => $health->run(),
        ], $healthy ? 200 : 503);
    }
}
