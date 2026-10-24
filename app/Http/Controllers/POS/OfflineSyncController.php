<?php

namespace App\Http\Controllers\POS;

use App\Domain\CashManagement\Models\Shift;
use App\Domain\POS\OfflineBundle;
use App\Domain\POS\OfflineSyncService;
use App\Http\Controllers\Concerns\ResolvesActiveBranch;
use App\Http\Controllers\Controller;
use App\Http\Requests\POS\SyncOfflineOperationsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineSyncController extends Controller
{
    use ResolvesActiveBranch;

    public function __construct(
        protected OfflineBundle $bundle,
        protected OfflineSyncService $sync,
    ) {}

    /**
     * The full snapshot the POS mirrors locally so it can keep selling offline.
     */
    public function bundle(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $user->tenant;
        $branch = $this->activeBranch($request);

        $shift = $branch
            ? Shift::query()->where('branch_id', $branch->getKey())->open()->latest('opened_at')->first()
            : null;

        return response()->json([
            'version' => $this->bundle->version($branch, $tenant),
            'generated_at' => now()->toIso8601String(),
            'branch' => $branch ? [
                'id' => $branch->getKey(),
                'name' => $branch->name,
                'currency' => $branch->effectiveCurrency(),
            ] : null,
            'shift' => $shift ? [
                'id' => $shift->getKey(),
                'opened_at' => $shift->opened_at?->toIso8601String(),
            ] : null,
            'data' => $this->bundle->build($branch, $tenant),
        ]);
    }

    /**
     * Replay a batch of offline operations. Always 200 when the batch is
     * well-formed: the per-operation result says what happened, so the client can
     * drop accepted operations and keep (or surface) the rest.
     */
    public function sync(SyncOfflineOperationsRequest $request): JsonResponse
    {
        $results = $this->sync->apply(
            $request->validated('operations'),
            $request->user(),
        );

        return response()->json([
            'results' => $results,
            'synced_at' => now()->toIso8601String(),
        ]);
    }
}
