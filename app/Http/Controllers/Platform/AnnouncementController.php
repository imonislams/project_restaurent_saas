<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Communications\Models\Announcement;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function __construct(protected AuditLogger $audit) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Marketing/Announcements', [
            'announcements' => Announcement::query()->latest('id')->get()->map(fn (Announcement $announcement) => [
                'id' => $announcement->getKey(),
                'title' => $announcement->title,
                'body' => $announcement->body,
                'level' => $announcement->level,
                'audience' => $announcement->audience ?? [],
                'is_active' => $announcement->is_active,
                'starts_at' => $announcement->starts_at?->toIso8601String(),
                'ends_at' => $announcement->ends_at?->toIso8601String(),
                'live' => $announcement->isLive(),
            ]),
            'options' => [
                'statuses' => collect(TenantStatus::cases())->map(fn (TenantStatus $status) => ['value' => $status->value, 'label' => $status->label()])->all(),
                'plans' => Plan::query()->orderBy('sort_order')->get(['name', 'slug'])->map(fn (Plan $plan) => ['value' => $plan->slug, 'label' => $plan->name])->all(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $announcement = Announcement::create($this->validated($request) + ['created_by' => $request->user()->getKey()]);

        $this->audit->log('platform.announcement_created', $announcement, ['title' => $announcement->title], $request->user());

        return back()->with('success', 'Announcement created.');
    }

    public function update(Request $request, Announcement $announcement): RedirectResponse
    {
        $announcement->update($this->validated($request));

        $this->audit->log('platform.announcement_updated', $announcement, ['title' => $announcement->title], $request->user());

        return back()->with('success', 'Announcement updated.');
    }

    public function toggle(Request $request, Announcement $announcement): RedirectResponse
    {
        $announcement->forceFill(['is_active' => ! $announcement->is_active])->save();

        $this->audit->log('platform.announcement_toggled', $announcement, ['active' => $announcement->is_active], $request->user());

        return back()->with('success', $announcement->is_active ? 'Announcement activated.' : 'Announcement deactivated.');
    }

    public function destroy(Request $request, Announcement $announcement): RedirectResponse
    {
        $this->audit->log('platform.announcement_deleted', $announcement, ['title' => $announcement->title], $request->user());
        $announcement->delete();

        return back()->with('success', 'Announcement deleted.');
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            'level' => ['required', Rule::in(['info', 'warning', 'critical'])],
            'audience' => ['nullable', 'array'],
            'audience.status' => ['nullable', 'string', Rule::in(array_map(fn ($c) => $c->value, TenantStatus::cases()))],
            'audience.plan' => ['nullable', 'string', 'max:80'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }
}
