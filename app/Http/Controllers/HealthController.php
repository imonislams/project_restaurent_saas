<?php

namespace App\Http\Controllers;

use App\Support\HealthChecker;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(HealthChecker $health): JsonResponse
    {
        $healthy = $health->healthy();

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => $health->run(),
        ], $healthy ? 200 : 503);
    }
}
