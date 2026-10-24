<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\POS\Models\OfflineSyncConflict;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Operations replayed from offline devices that the server resolved differently —
 * a different total, short stock, a closed shift or a taken table. Reviewing them
 * is how the difference is acknowledged rather than assumed away.
 */
class OfflineConflictController extends Controller
{
    public function __construct(protected AuditLogger $audit) {}

    public function index(Request $request): Response
    {
        $filters = [
            'status' => $request->string('status')->toString() ?: OfflineSyncConflict::STATUS_OPEN,
            'type' => $request->string('type')->toString(),
        ];

        return Inertia::render('Platform/OfflineConflicts', [
            'conflicts' => OfflineSyncConflict::query()
                ->with(['tenant:id,name', 'branch:id,name', 'order:id,order_number'])
                ->when($filters['status'] !== 'all', fn ($q) => $q->where('status', $filters['status']))
                ->when($filters['type'] !== '', fn ($q) => $q->where('type', $filters['type']))
                ->latest('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (OfflineSyncConflict $conflict) => [
                    'id' => $conflict->getKey(),
                    'type' => $conflict->type,
                    'status' => $conflict->status,
                    'message' => $conflict->message,
                    'offline_uuid' => $conflict->offline_uuid,
                    'operation_type' => $conflict->operation_type,
                    'order_reference' => $conflict->order_reference,
                    'order' => $conflict->order ? [
                        'id' => $conflict->order->getKey(),
                        'order_number' => $conflict->order->order_number,
                    ] : null,
                    'tenant' => $conflict->tenant?->name,
                    'branch' => $conflict->branch?->name,
                    'expected' => $conflict->expected,
                    'actual' => $conflict->actual,
                    'resolved_at' => $conflict->resolved_at?->toIso8601String(),
                    'resolution_note' => $conflict->resolution_note,
                    'created_at' => $conflict->created_at?->toIso8601String(),
                ]),
            'filters' => $filters,
            'summary' => [
                'open' => OfflineSyncConflict::query()->where('status', OfflineSyncConflict::STATUS_OPEN)->count(),
                'resolved' => OfflineSyncConflict::query()->where('status', OfflineSyncConflict::STATUS_RESOLVED)->count(),
            ],
            'types' => OfflineSyncConflict::query()->distinct()->orderBy('type')->pluck('type')->all(),
        ]);
    }

    public function resolve(Request $request, OfflineSyncConflict $conflict): RedirectResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:500']]);

        $conflict->forceFill([
            'status' => OfflineSyncConflict::STATUS_RESOLVED,
            'resolved_by' => $request->user()->getKey(),
            'resolved_at' => now(),
            'resolution_note' => $data['note'] ?? null,
        ])->save();

        $this->audit->log('platform.offline_conflict_resolved', $conflict, [
            'offline_uuid' => $conflict->offline_uuid,
            'type' => $conflict->type,
        ], $request->user(), $conflict->tenant_id);

        return back()->with('success', 'Conflict marked as reviewed.');
    }
}
