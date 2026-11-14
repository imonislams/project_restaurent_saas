<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Automation\AutomationService;
use App\Domain\Marketing\Enums\AutomationTrigger;
use App\Domain\Marketing\Enums\StepType;
use App\Domain\Marketing\Models\MarketingAutomation;
use App\Domain\Marketing\Models\MarketingAutomationLog;
use App\Domain\Marketing\Models\MarketingAutomationStep;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Automation workflows.
 *
 * A workflow is created as a draft and only runs when activated: turning a sequence on
 * is a deliberate act, never a side effect of saving it.
 */
class AutomationController extends Controller
{
    public function __construct(protected AutomationService $automations) {}

    public function index(): Response
    {
        return Inertia::render('Platform/Marketing/Automation/Index', [
            'automations' => MarketingAutomation::query()
                ->withCount(['steps', 'enrollments'])
                ->orderByDesc('is_system')
                ->orderBy('name')
                ->get()
                ->map(fn (MarketingAutomation $automation) => [
                    'id' => $automation->getKey(),
                    'name' => $automation->name,
                    'key' => $automation->key,
                    'description' => $automation->description,
                    'trigger' => $automation->trigger_type->value,
                    'trigger_label' => $automation->trigger_type->label(),
                    'status' => $automation->status,
                    'is_system' => $automation->is_system,
                    'steps' => $automation->steps()->get()->map(fn ($step) => [
                        'id' => $step->getKey(),
                        'type' => $step->type->value,
                        'template_key' => $step->template_key,
                        'delay_value' => $step->delay_value,
                        'delay_unit' => $step->delay_unit,
                    ])->all(),
                    'enrollments' => $automation->enrollments_count,
                    'last_run_at' => $automation->last_run_at?->toIso8601String(),
                ])
                ->all(),
            'triggers' => collect(AutomationTrigger::cases())->map(fn (AutomationTrigger $trigger) => [
                'value' => $trigger->value,
                'label' => $trigger->label(),
            ])->values(),
            'stepTypes' => collect(StepType::cases())->map(fn (StepType $type) => [
                'value' => $type->value,
                'label' => $type->label(),
            ])->values(),
            'logs' => MarketingAutomationLog::query()
                ->with('step:id,type')
                ->latest('id')
                ->limit(30)
                ->get()
                ->map(fn (MarketingAutomationLog $log) => [
                    'id' => $log->getKey(),
                    'status' => $log->status,
                    'message' => $log->message,
                    'step' => $log->step?->type->value,
                    'executed_at' => $log->executed_at?->toIso8601String(),
                ])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:255'],
            'trigger' => ['required', 'string', 'in:'.implode(',', AutomationTrigger::values())],
            'delay_value' => ['nullable', 'integer', 'min:0', 'max:365'],
            'template_key' => ['nullable', 'string', 'max:60'],
        ]);

        $automation = MarketingAutomation::create([
            'name' => $data['name'],
            'key' => Str::slug($data['name']).'-'.Str::lower(Str::random(5)),
            'description' => $data['description'] ?? null,
            'trigger_type' => $data['trigger'],
            // Always a draft: saving a workflow must not start mailing people.
            'status' => 'draft',
            'is_system' => false,
        ]);

        MarketingAutomationStep::create([
            'automation_id' => $automation->getKey(),
            'sort_order' => 0,
            'type' => StepType::Email->value,
            'template_key' => $data['template_key'] ?? null,
            'delay_value' => $data['delay_value'] ?? 0,
            'delay_unit' => 'days',
        ]);

        return back()->with('success', 'Workflow created as a draft with one email step.');
    }

    /**
     * Activate or pause. Activation is the only thing that makes a workflow live.
     */
    public function toggle(Request $request, MarketingAutomation $automation): RedirectResponse
    {
        $activate = $automation->status !== 'active';

        if ($activate && $automation->steps()->count() === 0) {
            return back()->with('error', 'Add at least one step before activating this workflow.');
        }

        $automation->forceFill(['status' => $activate ? 'active' : 'paused'])->save();

        app(AuditLogger::class)->log(
            $activate ? 'marketing.automation_activated' : 'marketing.automation_paused',
            $automation,
            ['key' => $automation->key],
            $request->user(),
        );

        return back()->with('success', $automation->name.' is '.($activate ? 'active.' : 'paused.'));
    }

    public function runNow(Request $request): RedirectResponse
    {
        $result = $this->automations->run(200);

        return back()->with('success', sprintf(
            'Processed %d enrolment(s): %d step(s) executed, %d skipped.',
            $result['processed'],
            $result['sent'],
            $result['skipped'],
        ));
    }

    public function seedPresets(Request $request): RedirectResponse
    {
        $created = $this->automations->seedPresets();

        return back()->with('success', $created === 0
            ? 'All built-in sequences are already present.'
            : $created.' built-in sequence(s) added as drafts.');
    }

    public function destroy(MarketingAutomation $automation): RedirectResponse
    {
        if ($automation->is_system) {
            return back()->with('error', 'Built-in sequences cannot be deleted; pause them instead.');
        }

        $automation->delete();

        return back()->with('success', 'Workflow deleted.');
    }
}
