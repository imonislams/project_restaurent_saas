<?php

namespace App\Http\Controllers\Platform;

use App\Domain\BackupAndRecovery\BackupService;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\BackupAndRecovery\Models\BackupRestore;
use App\Domain\BackupAndRecovery\RestoreService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreRestoreRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RestoreController extends Controller
{
    public function __construct(
        protected RestoreService $restores,
        protected BackupService $backups,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Restore/Index', [
            'restores' => BackupRestore::query()
                ->with(['backup:id,path', 'tenant:id,name,slug', 'requestedBy:id,name', 'approvedBy:id,name'])
                ->latest('id')
                ->paginate(25)
                ->through(fn (BackupRestore $restore) => [
                    'id' => $restore->getKey(),
                    'tenant' => $restore->tenant?->name,
                    'tenant_id' => $restore->tenant_id,
                    'backup' => $restore->backup?->path,
                    'reason' => $restore->reason,
                    'status' => $restore->status->value,
                    'requested_by' => $restore->requestedBy?->name,
                    'approved_by' => $restore->approvedBy?->name,
                    'verification_ok' => $restore->verification['ok'] ?? null,
                    'created_at' => $restore->created_at?->toIso8601String(),
                    'completed_at' => $restore->completed_at?->toIso8601String(),
                ]),
            'candidates' => Backup::query()
                ->with('tenant:id,name')
                ->where('scope', 'tenant')
                ->where('verification_result', 'ok')
                ->latest('id')
                ->limit(200)
                ->get()
                ->map(fn (Backup $backup) => [
                    'value' => (string) $backup->getKey(),
                    'label' => ($backup->tenant?->name ?? 'Tenant #'.$backup->tenant_id).' · '.$backup->created_at?->toDateTimeString().' · '.$backup->humanSize(),
                ])->all(),
        ]);
    }

    public function store(StoreRestoreRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $backup = Backup::query()->findOrFail($data['backup_id']);
        $tenant = Tenant::query()->findOrFail($backup->tenant_id);

        $this->restores->request($backup, $tenant, $data['reason'], $request->user());

        return back()->with('success', 'Restore requested. Review and execute it from the restore list.');
    }

    public function show(BackupRestore $restore): Response
    {
        $restore->load(['backup', 'checkpoint', 'tenant:id,name,slug', 'requestedBy:id,name', 'approvedBy:id,name']);

        return Inertia::render('Platform/Restore/Show', [
            'restore' => [
                'id' => $restore->getKey(),
                'tenant' => $restore->tenant?->name,
                'tenant_slug' => $restore->tenant?->slug,
                'tenant_id' => $restore->tenant_id,
                'backup' => $restore->backup?->path,
                'checkpoint' => $restore->checkpoint?->path,
                'reason' => $restore->reason,
                'status' => $restore->status->value,
                'requested_by' => $restore->requestedBy?->name,
                'approved_by' => $restore->approvedBy?->name,
                'verification' => $restore->verification,
                'error' => $restore->error,
                'started_at' => $restore->started_at?->toIso8601String(),
                'completed_at' => $restore->completed_at?->toIso8601String(),
                'created_at' => $restore->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function execute(Request $request, BackupRestore $restore): RedirectResponse
    {
        $data = $request->validate(['confirm' => ['required', 'string']]);

        $restore->loadMissing('tenant');

        abort_unless($restore->tenant !== null, 422, 'The restore tenant is missing.');
        abort_unless($data['confirm'] === $restore->tenant->slug, 422, 'Type the tenant identifier exactly to confirm.');
        abort_unless($restore->status->value === 'approved', 422, 'This restore has already been run.');

        try {
            $verification = $this->restores->execute($restore, $request->user());

            return back()->with(
                $verification['ok'] ? 'success' : 'error',
                $verification['ok'] ? 'Restore completed and isolation verified.' : 'Restore completed with verification warnings — review the details.',
            );
        } catch (\Throwable $e) {
            return back()->with('error', 'Restore failed: '.$e->getMessage());
        }
    }
}
