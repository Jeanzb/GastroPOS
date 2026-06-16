import { MetricCard } from '@/components/operations';
import { DASHBOARD_METRICS } from '@/constants';
import type { MetricSummary } from '@/types/operations';
import { DashboardSidePanel } from './DashboardSidePanel';
import { HourlySalesChart } from './HourlySalesChart';

function renderMetricCard(metric: MetricSummary) {
  return <MetricCard key={metric.label} metric={metric} />;
}

export function DashboardOverview() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_METRICS.map(renderMetricCard)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <HourlySalesChart />
        <DashboardSidePanel />
      </div>
    </div>
  );
}
