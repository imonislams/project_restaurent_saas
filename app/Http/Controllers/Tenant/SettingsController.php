<?php

namespace App\Http\Controllers\Tenant;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\BranchRequest;
use App\Http\Requests\Onboarding\CompanyRequest;
use App\Http\Requests\Onboarding\HoursRequest;
use App\Http\Requests\Onboarding\ReceiptRequest;
use App\Http\Requests\Onboarding\TaxRequest;
use App\Http\Requests\Tenant\NotificationSettingsRequest;
use App\Http\Requests\Tenant\PosSettingsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The restaurant owner's settings hub. Each tab edits the same tenant settings
 * (and branch/business hours) that onboarding writes, so there is one source of
 * truth. Every change is audited.
 */
class SettingsController extends Controller
{
    public const GROUPS = ['company', 'branches', 'hours', 'tax', 'receipt', 'pos', 'notifications', 'qr'];

    public function __construct(
        protected OnboardingService $onboarding,
        protected AuditLogger $audit,
    ) {}

    public function index(): RedirectResponse
    {
        return redirect()->route('settings.show', ['group' => 'company']);
    }

    public function show(Request $request, string $group): Response
    {
        $tenant = $this->tenant($request);
        abort_unless(in_array($group, self::GROUPS, true), 404);

        return Inertia::render('Settings/Show', [
            'group' => $group,
            'form' => $this->onboarding->settingsFormData($tenant, $group),
            'options' => $this->onboarding->options(),
        ]);
    }

    public function update(Request $request, string $group): RedirectResponse
    {
        $tenant = $this->tenant($request);
        abort_unless(in_array($group, self::GROUPS, true), 404);

        $data = $request->validate($this->rulesFor($group));

        match ($group) {
            'company' => $this->onboarding->saveCompany($tenant, $data),
            'branches' => $this->onboarding->saveBranch($tenant, $data),
            'hours' => $this->onboarding->saveHours($tenant, $data['days']),
            'tax' => $this->onboarding->saveTax($tenant, $data),
            'receipt' => $this->onboarding->saveReceipt($tenant, $data),
            'pos' => $this->onboarding->savePos($tenant, $data),
            'notifications' => $this->onboarding->saveNotifications($tenant, $data),
            'qr' => $this->onboarding->saveQr($tenant, $data),
        };

        $this->audit->log("settings.{$group}_updated", $tenant, [], $request->user(), $tenant->getKey());

        return back()->with('success', 'Settings saved.');
    }

    /** @return array<string, mixed> */
    protected function rulesFor(string $group): array
    {
        return match ($group) {
            'company' => app(CompanyRequest::class)->rules(),
            'branches' => app(BranchRequest::class)->rules(),
            'hours' => app(HoursRequest::class)->rules(),
            'tax' => app(TaxRequest::class)->rules(),
            'receipt' => app(ReceiptRequest::class)->rules(),
            'pos' => app(PosSettingsRequest::class)->rules(),
            'notifications' => app(NotificationSettingsRequest::class)->rules(),
            'qr' => app(\App\Http\Requests\Tenant\QrSettingsRequest::class)->rules(),
        };
    }

    protected function tenant(Request $request): Tenant
    {
        $tenant = $request->user()?->tenant;

        abort_if($tenant === null, 403);

        return $tenant;
    }
}
