<?php

namespace App\Domain\Reporting;

use App\Domain\Tenancy\Models\Tenant;

/**
 * Composes the period-driven Overview dashboard from the reporting engine.
 *
 * Money is never conflated: sales follow the order's placed date, while
 * "Payments collected" follows each payment's own paid_at. Figures that do not
 * belong to a date range (low stock, pending approvals, active guests) are
 * served separately as the always-on "right now" strip.
 */
class DashboardOverviewService
{
    public function __construct(protected ReportService $reports) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Tenant $tenant, ReportPeriod $period, bool $tenantWide = false): array
    {
        $previous = $period->previous();

        $current = $this->reports->salesMetrics($period);
        $prior = $this->reports->salesMetrics($previous);
        $collected = $this->reports->collectedTotal($period);
        $collectedPrior = $this->reports->collectedTotal($previous);

        return [
            'currency' => $tenant->getSetting('region.currency', 'USD'),
            'kpis' => [
                $this->kpi('dash.kpi.net_sales', $current['net'], 'money', $this->delta($current['net'], $prior['net'])),
                $this->kpi('dash.kpi.orders', $current['orders'], 'number', $this->delta($current['orders'], $prior['orders'])),
                $this->kpi('dash.kpi.average_ticket', $current['average_ticket'], 'money', $this->delta($current['average_ticket'], $prior['average_ticket'])),
                $this->kpi('dash.kpi.payments_collected', $collected, 'money', $this->delta($collected, $collectedPrior)),
            ],
            'kpis_secondary' => [
                $this->kpi('dash.kpi.gross_sales', $current['gross'], 'money', $this->delta($current['gross'], $prior['gross'])),
                $this->kpi('dash.kpi.discounts', $current['discounts'], 'money', $this->delta($current['discounts'], $prior['discounts'])),
                $this->kpi('dash.kpi.tax_collected', $current['tax'], 'money', $this->delta($current['tax'], $prior['tax'])),
                $this->kpi('dash.kpi.refunds', $current['refunds'], 'money', $this->delta($current['refunds'], $prior['refunds'])),
            ],
            'profit' => $this->profitKpis($period),
            'trend' => $this->trendSeries($period, $previous),
            'top_products' => $this->reports->products($period)['chart'],
            'payment_mix' => $this->reports->collected($period)['chart'],
            'busiest_hours' => collect($this->reports->hourly($period)['rows'])
                ->map(fn (array $row) => ['label' => $row['hour'], 'value' => $row['orders']])
                ->all(),
            'order_stats' => $this->reports->orders($period),
            'branches' => $tenantWide ? $this->reports->branches($period)['rows'] : null,
            'staff' => $this->reports->staff($period)['rows'],
        ];
    }

    /**
     * Profitability for the period, relabelled as translation keys. Values come
     * straight from the profit report so the dashboard and /reports agree.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function profitKpis(ReportPeriod $period): array
    {
        $summary = collect($this->reports->profit($period)['summary'])->keyBy('label');
        $value = fn (string $label) => $summary->get($label, [])['value'] ?? 0;

        return [
            $this->kpi('dash.kpi.net_sales_excl_tax', $value('Net sales (excl. tax)'), 'money', null),
            $this->kpi('dash.kpi.cogs', $value('Cost of goods sold'), 'money', null),
            $this->kpi('dash.kpi.gross_profit', $value('Gross profit'), 'money', null),
            $this->kpi('dash.kpi.gross_margin', $value('Gross margin'), 'percent', null),
            $this->kpi('dash.kpi.operating_expenses', $value('Operating expenses'), 'money', null),
            $this->kpi('dash.kpi.net_operating', $value('Net operating result'), 'money', null),
        ];
    }

    /**
     * Current net-sales trend with the previous period aligned index-for-index,
     * so the chart can overlay the two. The previous series is truncated to the
     * current length (e.g. week-to-date compares against the same days last week).
     *
     * @return array<int, array{label: string, value: float, previous: float}>
     */
    protected function trendSeries(ReportPeriod $period, ReportPeriod $previous): array
    {
        $current = $this->reports->netTrend($period);
        $prior = $this->reports->netTrend($previous);

        $series = [];
        foreach ($current as $index => $point) {
            $series[] = [
                'label' => $point['label'],
                'value' => $point['value'],
                'previous' => $prior[$index]['value'] ?? 0.0,
            ];
        }

        return $series;
    }

    /**
     * @return array{label: string, value: float|int, format: string, delta: float|null}
     */
    protected function kpi(string $label, float|int $value, string $format, ?float $delta): array
    {
        return ['label' => $label, 'value' => $value, 'format' => $format, 'delta' => $delta];
    }

    /**
     * Percentage change versus the previous period. Null when there is no
     * baseline (previous is zero), so the UI can show "—" instead of a
     * meaningless jump.
     */
    protected function delta(float|int $current, float|int $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return null;
        }

        return round((((float) $current - (float) $previous) / (float) $previous) * 100, 1);
    }
}
