<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\Models\AuditLog;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        return Inertia::render('Platform/Audit', [
            'logs' => $this->query($filters)
                ->with(['actor:id,name'])
                ->latest('id')
                ->paginate(50)
                ->withQueryString()
                ->through(fn (AuditLog $log) => $this->row($log)),
            'filters' => $filters,
            'actors' => User::query()->where('is_platform_admin', true)->orderBy('name')->get(['id', 'name'])
                ->map(fn (User $user) => ['value' => (string) $user->getKey(), 'label' => $user->name])->all(),
        ]);
    }

    public function maintenanceHistory(Request $request): Response
    {
        if (! $request->has('action')) {
            $request->merge(['action' => 'platform.maintenance']);
        }

        return $this->index($request);
    }

    public function impersonation(Request $request): Response
    {
        $logs = AuditLog::query()
            ->with(['actor:id,name', 'tenant:id,name'])
            ->where('action', 'like', 'platform.impersonation%')
            ->latest('id')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->getKey(),
                'action' => $log->action,
                'actor' => $log->actor?->name,
                'tenant' => $log->tenant?->name,
                'tenant_id' => $log->tenant_id,
                'metadata' => $log->metadata,
                'ip' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Platform/Security/Impersonation', ['logs' => $logs]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);

        $query = $this->query($filters)->with(['actor:id,name'])->latest('id');

        $filename = 'audit-log-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['When', 'Action', 'Actor', 'Tenant', 'Subject', 'IP', 'Metadata']);

            $query->chunk(500, function ($logs) use ($out) {
                foreach ($logs as $log) {
                    fputcsv($out, [
                        $log->created_at?->toIso8601String(),
                        $log->action,
                        $log->actor?->name,
                        $log->tenant_id,
                        $log->subject_type ? class_basename($log->subject_type).'#'.$log->subject_id : null,
                        $log->ip_address,
                        $log->metadata ? json_encode($log->metadata) : null,
                    ]);
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /** @param array<string, mixed> $filters */
    protected function query(array $filters): Builder
    {
        return AuditLog::query()
            ->when($filters['action'] !== '', fn (Builder $q) => $q->where('action', 'like', '%'.$filters['action'].'%'))
            ->when($filters['actor'] !== '', fn (Builder $q) => $q->where('user_id', $filters['actor']))
            ->when($filters['tenant'] !== '', fn (Builder $q) => $q->where('tenant_id', $filters['tenant']))
            ->when($filters['from'] !== '', fn (Builder $q) => $q->whereDate('created_at', '>=', $filters['from']))
            ->when($filters['to'] !== '', fn (Builder $q) => $q->whereDate('created_at', '<=', $filters['to']));
    }

    /** @return array<string, mixed> */
    protected function filters(Request $request): array
    {
        return [
            'action' => $request->string('action')->toString(),
            'actor' => $request->string('actor')->toString(),
            'tenant' => $request->string('tenant')->toString(),
            'from' => $request->string('from')->toString(),
            'to' => $request->string('to')->toString(),
        ];
    }

    /** @return array<string, mixed> */
    protected function row(AuditLog $log): array
    {
        return [
            'id' => $log->getKey(),
            'tenant_id' => $log->tenant_id,
            'action' => $log->action,
            'actor' => $log->actor?->name,
            'subject' => $log->subject_type ? class_basename($log->subject_type).'#'.$log->subject_id : null,
            'metadata' => $log->metadata,
            'ip' => $log->ip_address,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }
}
