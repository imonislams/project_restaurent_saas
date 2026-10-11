<?php

namespace App\Http\Controllers\Platform;

use App\Domain\BackupAndRecovery\BackupService;
use App\Domain\BackupAndRecovery\Enums\BackupScope;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    public function __construct(protected BackupService $backups) {}

    public function index(Request $request): Response
    {
        return $this->listing($request);
    }

    public function tenants(Request $request): Response
    {
        $request->merge(['scope' => 'tenant']);

        return $this->listing($request);
    }

    protected function listing(Request $request): Response
    {
        $filters = [
            'scope' => $request->string('scope')->toString(),
            'tenant' => $request->string('tenant')->toString(),
        ];

        return Inertia::render('Platform/Backups/Index', [
            'backups' => Backup::query()
                ->with(['tenant:id,name', 'createdBy:id,name'])
                ->when($filters['scope'] !== '', fn ($q) => $q->where('scope', $filters['scope']))
                ->when($filters['tenant'] !== '', fn ($q) => $q->where('tenant_id', $filters['tenant']))
                ->latest('id')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (Backup $backup) => [
                    'id' => $backup->getKey(),
                    'scope' => $backup->scope->value,
                    'tenant' => $backup->tenant?->name,
                    'tenant_id' => $backup->tenant_id,
                    'path' => $backup->path,
                    'size' => $backup->humanSize(),
                    'checksum' => $backup->checksum ? substr($backup->checksum, 0, 12) : null,
                    'encrypted' => $backup->encrypted,
                    'tables_count' => $backup->tables_count,
                    'rows_count' => $backup->rows_count,
                    'verification_result' => $backup->verification_result,
                    'verified_at' => $backup->verified_at?->toIso8601String(),
                    'expires_at' => $backup->expires_at?->toIso8601String(),
                    'created_at' => $backup->created_at?->toIso8601String(),
                    'created_by' => $backup->createdBy?->name,
                ]),
            'stats' => [
                'total' => Backup::query()->count(),
                'unverified' => Backup::query()->whereNull('verified_at')->count(),
                'failed_verification' => Backup::query()->where('verification_result', 'failed')->count(),
                'expiring_soon' => Backup::query()->whereNotNull('expires_at')->where('expires_at', '<', now()->addDays(7))->count(),
                'total_bytes' => (int) Backup::query()->sum('bytes'),
            ],
            'filters' => $filters,
            'tenants' => Tenant::query()->orderBy('name')->limit(200)->get(['id', 'name'])
                ->map(fn (Tenant $tenant) => ['value' => (string) $tenant->getKey(), 'label' => $tenant->name])->all(),
            'scopes' => collect(BackupScope::cases())->map(fn (BackupScope $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
        ]);
    }

    public function storePlatform(Request $request): RedirectResponse
    {
        $backup = $this->backups->createPlatform($request->user());

        return back()->with('success', "Platform backup created ({$backup->rows_count} rows, {$backup->humanSize()}).");
    }

    public function storeTenant(Request $request, Tenant $tenant): RedirectResponse
    {
        $backup = $this->backups->createTenant($tenant, $request->user());

        return back()->with('success', "Backup created for {$tenant->name} ({$backup->rows_count} rows, {$backup->humanSize()}).");
    }

    public function verify(Request $request, Backup $backup): RedirectResponse
    {
        $result = $this->backups->verify($backup);

        return back()->with($result['ok'] ? 'success' : 'error', $result['notes']);
    }

    public function destroy(Request $request, Backup $backup): RedirectResponse
    {
        $this->backups->delete($backup);

        return back()->with('success', 'Backup deleted.');
    }

    public function prune(Request $request): RedirectResponse
    {
        $count = $this->backups->prune();

        return back()->with('success', "Pruned {$count} expired backup(s).");
    }

    public function download(Request $request, Backup $backup): StreamedResponse
    {
        abort_unless(Storage::disk($backup->disk)->exists($backup->path), 404);

        return Storage::disk($backup->disk)->download($backup->path, basename($backup->path));
    }
}
