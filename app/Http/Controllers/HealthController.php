<?php

namespace App\Http\Controllers;

use App\Support\AppVersion;
use App\Support\HealthChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    public function __invoke(Request $request, HealthChecker $health, AppVersion $version): JsonResponse
    {
        $healthy = $health->healthy();

        // Public probes only need the status. Version, commit and per-check detail
        // let an outsider fingerprint the exact build, so they are disclosed only
        // to a platform admin or when explicitly opted in for a trusted monitor.
        if (! $this->maySeeDetail($request)) {
            return response()->json(['status' => $healthy ? 'ok' : 'degraded'], $healthy ? 200 : 503);
        }

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'version' => $version->version(),
            'commit' => $version->commit(),
            'checks' => $health->run(),
        ], $healthy ? 200 : 503);
    }

    protected function maySeeDetail(Request $request): bool
    {
        if (config('app.health_disclose_detail', false)) {
            return true;
        }

        return (bool) $request->user()?->isPlatformAdmin();
    }
}
