<?php

namespace App\Http\Controllers\Install;

use App\Domain\Installer\InstallerService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Install\AdministratorRequest;
use App\Http\Requests\Install\ApplicationRequest;
use App\Http\Requests\Install\DatabaseRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * First-run setup wizard. Reachable only while the application is not installed
 * (see EnsureNotInstalled); writes .env, migrates, seeds, creates the first
 * administrator, then locks the installer.
 */
class InstallerController extends Controller
{
    /** @var list<string> */
    public const STEPS = ['requirements', 'database', 'application', 'administrator'];

    public function __construct(protected InstallerService $installer) {}

    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('install.show', ['step' => $this->currentStep($request)]);
    }

    public function show(Request $request, string $step): Response|RedirectResponse
    {
        if (! in_array($step, self::STEPS, true) || $this->isBeyondCurrent($request, $step)) {
            return redirect()->route('install.show', ['step' => $this->currentStep($request)]);
        }

        return Inertia::render('Install/Show', [
            'step' => $step,
            'steps' => $this->stepList($request),
            'requirements' => $step === 'requirements' ? $this->installer->requirements() : [],
            'requirementsMet' => $this->installer->requirementsMet(),
            'form' => $this->formData($request, $step),
            'options' => [
                'drivers' => ['mysql', 'mariadb', 'pgsql'],
                'timezones' => array_values((array) config('geo.timezones', ['UTC'])),
            ],
        ]);
    }

    public function store(Request $request, string $step): RedirectResponse
    {
        if (! in_array($step, self::STEPS, true)) {
            return redirect()->route('install.show', ['step' => $this->currentStep($request)]);
        }

        // FormRequests must be resolved through the container so their
        // validation runs (they cannot be type-hinted on a dispatched method).
        return match ($step) {
            'requirements' => $this->storeRequirements($request),
            'database' => $this->storeDatabase(app(DatabaseRequest::class)),
            'application' => $this->storeApplication(app(ApplicationRequest::class)),
            'administrator' => $this->storeAdministrator(app(AdministratorRequest::class)),
        };
    }

    public function complete(): Response
    {
        return Inertia::render('Install/Complete', [
            'installed' => $this->installer->isInstalled(),
        ]);
    }

    protected function storeRequirements(Request $request): RedirectResponse
    {
        if (! $this->installer->requirementsMet()) {
            return back()->with('error', 'Resolve the failed requirements before continuing.');
        }

        return redirect()->route('install.show', ['step' => 'database']);
    }

    protected function storeDatabase(DatabaseRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $connection = $this->installer->testDatabase($data);

        if (! $connection['ok']) {
            return back()->withErrors(['host' => 'Could not connect: '.$connection['message']])->withInput();
        }

        if ($this->installer->databaseHasTables($data) && empty($data['confirm_existing'])) {
            return back()->withErrors([
                'confirm_existing' => 'This database already contains tables. Tick the confirmation to proceed.',
            ])->withInput();
        }

        $request->session()->put('install.database', $data);

        return redirect()->route('install.show', ['step' => 'application']);
    }

    protected function storeApplication(ApplicationRequest $request): RedirectResponse
    {
        $request->session()->put('install.application', $request->validated());

        return redirect()->route('install.show', ['step' => 'administrator']);
    }

    protected function storeAdministrator(AdministratorRequest $request): RedirectResponse
    {
        $database = $request->session()->get('install.database');
        $application = $request->session()->get('install.application');

        if (! is_array($database) || ! is_array($application)) {
            return redirect()->route('install.show', ['step' => $this->currentStep($request)])
                ->with('error', 'Please complete the earlier steps first.');
        }

        $data = $request->validated();

        try {
            $result = $this->installer->install([
                'database' => $database,
                'application' => $application,
                'administrator' => [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => $data['password'],
                ],
                'owner' => [
                    'create' => (bool) ($data['create_owner'] ?? false),
                    'name' => $data['owner_name'] ?? null,
                    'email' => $data['owner_email'] ?? null,
                    'password' => $data['owner_password'] ?? null,
                    'restaurant_name' => $data['restaurant_name'] ?? null,
                ],
                'confirm_existing' => (bool) ($database['confirm_existing'] ?? false),
            ]);
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $request->session()->forget(['install.database', 'install.application']);

        return redirect()->route('install.complete')
            ->with('success', 'Installation complete. Signed in as '.$result['admin_email'].'.');
    }

    protected function currentStep(Request $request): string
    {
        if (! $this->installer->requirementsMet()) {
            return 'requirements';
        }

        if (! $request->session()->has('install.database')) {
            return 'database';
        }

        if (! $request->session()->has('install.application')) {
            return 'application';
        }

        return 'administrator';
    }

    protected function isBeyondCurrent(Request $request, string $step): bool
    {
        return array_search($step, self::STEPS, true) > array_search($this->currentStep($request), self::STEPS, true);
    }

    /** @return list<array{value: string, label: string, done: bool}> */
    protected function stepList(Request $request): array
    {
        $current = array_search($this->currentStep($request), self::STEPS, true);

        return array_map(fn (string $step, int $index) => [
            'value' => $step,
            'label' => ucfirst($step),
            'done' => $index < $current,
        ], self::STEPS, array_keys(self::STEPS));
    }

    /** @return array<string, mixed> */
    protected function formData(Request $request, string $step): array
    {
        return match ($step) {
            'database' => array_merge([
                'driver' => 'mysql',
                'host' => '127.0.0.1',
                'port' => 3306,
                'database' => '',
                'username' => '',
                'password' => '',
                'confirm_existing' => false,
            ], (array) $request->session()->get('install.database', [])),
            'application' => array_merge([
                'name' => 'Touch Dine',
                'url' => (string) (config('app.url') ?: ''),
                'timezone' => (string) config('app.timezone', 'UTC'),
            ], (array) $request->session()->get('install.application', [])),
            default => [],
        };
    }
}
