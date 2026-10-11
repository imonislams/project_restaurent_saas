<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\Models\AuditLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $action = $request->string('action')->toString();

        $logs = AuditLog::query()
            ->with(['actor:id,name'])
            ->when($action !== '', fn ($q) => $q->where('action', 'like', "%{$action}%"))
            ->latest('id')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->getKey(),
                'tenant_id' => $log->tenant_id,
                'action' => $log->action,
                'actor' => $log->actor?->name,
                'subject' => $log->subject_type ? class_basename($log->subject_type).'#'.$log->subject_id : null,
                'metadata' => $log->metadata,
                'ip' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Platform/Audit', [
            'logs' => $logs,
            'filters' => ['action' => $action],
        ]);
    }
}
