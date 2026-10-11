<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SessionController extends Controller
{
    public function __construct(protected AuditLogger $audit) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $adminIds = User::query()->where('is_platform_admin', true)->pluck('id');

        $sessions = DB::table('sessions')
            ->whereIn('user_id', $adminIds)
            ->when($search !== '', fn ($q) => $q->where('ip_address', 'like', '%'.$search.'%'))
            ->orderByDesc('last_activity')
            ->paginate(25)
            ->withQueryString()
            ->through(function ($session) use ($request) {
                $user = User::query()->find($session->user_id);

                return [
                    'id' => $session->id,
                    'user' => $user?->name,
                    'user_id' => $session->user_id,
                    'email' => $user?->email,
                    'ip' => $session->ip_address,
                    'user_agent' => mb_substr((string) $session->user_agent, 0, 100),
                    'last_activity' => Carbon::createFromTimestamp($session->last_activity)->toIso8601String(),
                    'is_current' => $session->id === $request->session()->getId(),
                ];
            });

        return Inertia::render('Platform/Security/Sessions', [
            'sessions' => $sessions,
            'filters' => ['search' => $search],
        ]);
    }

    public function destroy(Request $request, string $id): RedirectResponse
    {
        // Only revoke sessions belonging to platform administrators.
        $adminIds = User::query()->where('is_platform_admin', true)->pluck('id');
        $session = DB::table('sessions')->where('id', $id)->first();

        abort_unless($session && $adminIds->contains($session->user_id), 404);

        DB::table('sessions')->where('id', $id)->delete();

        $this->audit->log('platform.admin_session_revoked', null, ['session' => $id, 'user_id' => $session->user_id], $request->user());

        return back()->with('success', 'Session revoked.');
    }
}
