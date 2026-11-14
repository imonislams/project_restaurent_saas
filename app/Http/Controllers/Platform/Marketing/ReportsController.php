<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Insights\InsightService;
use App\Domain\Marketing\Models\MarketingAlertRule;
use App\Domain\Marketing\Models\MarketingInsight;
use App\Domain\Marketing\Reporting\MarketingReportService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Http\Controllers\Controller;
use App\Support\Csv;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Marketing reports, exports and the alert feed.
 *
 * A report always carries its definition, source and limitation, and an export is the
 * same rows the screen shows — one code path, so the file cannot disagree with the
 * page.
 */
class ReportsController extends Controller
{
    public const PRESETS = ['today', 'yesterday', '7d', '30d', '90d', '12m'];

    public function __construct(
        protected MarketingReportService $reports,
        protected InsightService $insights,
    ) {}

    public function index(Request $request): Response
    {
        $period = $this->period($request);
        $reports = $this->reports->all($period);
        $this->insights->ensureRules();

        return Inertia::render('Platform/Marketing/Reports/Index', [
            'period' => $this->periodProps($request, $period),
            'reports' => $reports,
            'insights' => MarketingInsight::query()->latest('id')->limit(25)->get()->map(fn (MarketingInsight $insight) => [
                'id' => $insight->getKey(),
                'severity' => $insight->severity,
                'title' => $insight->title,
                'body' => $insight->body,
                'generated_at' => $insight->generated_at?->toIso8601String(),
                'acknowledged_at' => $insight->acknowledged_at?->toIso8601String(),
            ])->all(),
            'rules' => MarketingAlertRule::query()->orderBy('name')->get()->map(fn (MarketingAlertRule $rule) => [
                'id' => $rule->getKey(),
                'name' => $rule->name,
                'metric' => $rule->metric,
                'operator' => $rule->operator->label(),
                'threshold' => (float) $rule->threshold,
                'cooldown_minutes' => $rule->cooldown_minutes,
                'is_enabled' => $rule->is_enabled,
                'last_triggered_at' => $rule->last_triggered_at?->toIso8601String(),
            ])->all(),
            'metrics' => collect($this->insights->metrics($period))->map(fn (array $metric) => [
                'label' => $metric['label'],
                'unit' => $metric['unit'],
                'value' => $metric['value'],
                'reason' => $metric['reason'] ?? null,
            ])->values()->all(),
        ]);
    }

    /**
     * The report as CSV — the same rows as the screen, permission-checked and audited.
     */
    public function export(Request $request, string $key): StreamedResponse
    {
        $period = $this->period($request, '90d');
        $report = $this->reports->one($key, $period);

        abort_if($report === null, 404, 'Unknown report.');

        app(AuditLogger::class)->log('marketing.report_exported', null, [
            'report' => $key,
            'period' => $period->label,
            'rows' => count($report['rows']),
        ], $request->user());

        return response()->streamDownload(function () use ($report) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, array_map(fn (array $column) => $column['label'], $report['columns']));

            foreach ($report['rows'] as $row) {
                fputcsv($handle, Csv::row(array_map(fn (array $column) => (string) ($row[$column['key']] ?? ''), $report['columns'])));
            }

            fclose($handle);
        }, 'marketing-'.$key.'-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    public function acknowledge(Request $request, MarketingInsight $insight): RedirectResponse
    {
        $this->insights->acknowledge($insight, $request->user());

        return back()->with('success', 'Insight acknowledged.');
    }

    public function evaluate(Request $request): RedirectResponse
    {
        $result = $this->insights->evaluate();

        return back()->with('success', sprintf('Evaluated %d rule(s); %d fired.', $result['evaluated'], $result['fired']));
    }

    protected function period(Request $request, string $default = '90d'): PlatformPeriod
    {
        $preset = (string) $request->string('preset');
        $preset = in_array($preset, [...self::PRESETS, 'custom'], true) ? $preset : $default;

        return PlatformPeriod::make(
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
            $preset === 'custom' ? null : $preset,
        );
    }

    /** @return array<string, string> */
    protected function periodProps(Request $request, PlatformPeriod $period): array
    {
        $preset = (string) $request->string('preset');

        return [
            'preset' => in_array($preset, [...self::PRESETS, 'custom'], true) ? $preset : '90d',
            'from' => $period->localFrom()->toDateString(),
            'to' => $period->localTo()->toDateString(),
            'label' => $period->label,
            'timezone' => $period->timezone,
        ];
    }
}
