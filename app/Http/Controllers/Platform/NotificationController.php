<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Platform/Notifications', [
            'notifications' => $user->notifications()->latest()->paginate(30)->through(fn (DatabaseNotification $notification) => [
                'id' => $notification->id,
                'type' => class_basename($notification->type),
                'data' => $notification->data,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
            ]),
            'unread' => $user->unreadNotifications()->count(),
        ]);
    }

    /** Latest few notifications for the header bell popover. */
    public function recent(Request $request): JsonResponse
    {
        return response()->json([
            'items' => $request->user()->notifications()->latest()->limit(6)->get()
                ->map(fn (DatabaseNotification $n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'] ?? class_basename($n->type),
                    'body' => $n->data['body'] ?? $n->data['message'] ?? null,
                    'level' => $n->data['level'] ?? 'info',
                    'url' => $n->data['url'] ?? null,
                    'read' => $n->read_at !== null,
                    'created_at' => $n->created_at?->toIso8601String(),
                ])->values(),
            'unread' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function destroy(Request $request, string $id): \Illuminate\Http\RedirectResponse
    {
        $request->user()->notifications()->findOrFail($id)->delete();

        return back()->with('success', 'Notification deleted.');
    }

    public function clear(Request $request): \Illuminate\Http\RedirectResponse
    {
        $request->user()->notifications()->delete();

        return back()->with('success', 'All notifications deleted.');
    }

    public function markAllRead(Request $request): \Illuminate\Http\RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back()->with('success', 'All notifications marked as read.');
    }
}
