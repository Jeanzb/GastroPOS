import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '@/components/operations';
import { QUERY_KEYS } from '@/constants';
import { useCashSession } from '@/hooks/cash';
import { useReports } from '@/hooks/reports';
import { useActiveBranch } from '@/hooks/tenancy';
import { InventoryService } from '@/services/inventory';
import { formatMoney } from '@/lib/format';
import type { MetricSummary } from '@/types/operations';
import { DashboardSidePanel } from './DashboardSidePanel';
import { HourlySalesChart } from './HourlySalesChart';

function renderMetricCard(metric: MetricSummary) {
  return <MetricCard key={metric.label} metric={metric} />;
}

export function DashboardOverview() {
  const activeBranch = useActiveBranch();
  const activeBranchId = activeBranch?.id;
  const reports = useReports();
  const cash = useCashSession();
  const lowStockQuery = useQuery({
    queryKey: [
      QUERY_KEYS.inventoryItems,
      { lowStockOnly: true, page: 1, pageSize: 8, branchId: activeBranchId },
    ],
    queryFn: () =>
      InventoryService.getItems({
        lowStockOnly: true,
        page: 1,
        pageSize: 8,
        branchId: activeBranchId,
      }),
  });
  const summary = reports.summaryQuery.data;
  const currency = summary?.currency ?? 'COP';
  const metrics: MetricSummary[] = [
    {
      label: 'Ventas de hoy',
      value: formatMoney(summary?.totalSales ?? 0, currency),
      trend: summary ? `${summary.itemsSold} items` : 'Sin datos',
      direction: summary && summary.totalSales > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Tickets cerrados',
      value: String(summary?.ticketCount ?? 0),
      trend: 'Ventas cerradas',
      direction: summary && summary.ticketCount > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Ticket promedio',
      value: formatMoney(summary?.averageTicket ?? 0, currency),
      trend: 'Promedio real',
      direction: summary && summary.averageTicket > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Facturas solicitadas',
      value: String(summary?.invoicedCount ?? 0),
      trend: 'Borradores fiscales',
      direction: summary && summary.invoicedCount > 0 ? 'up' : 'neutral',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reports.summaryQuery.isLoading
          ? ['Ventas', 'Tickets', 'Promedio', 'Facturas'].map((label) =>
              renderMetricCard({ label, value: '-', trend: 'Cargando', direction: 'neutral' }),
            )
          : metrics.map(renderMetricCard)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <HourlySalesChart
          summary={summary}
          isLoading={reports.summaryQuery.isLoading}
          isError={reports.summaryQuery.isError}
        />
        <DashboardSidePanel
          cashSession={cash.activeSessionQuery.data}
          cashLoading={cash.activeSessionQuery.isLoading}
          topProducts={summary?.topProducts ?? []}
          topProductsLoading={reports.summaryQuery.isLoading}
          lowStockItems={lowStockQuery.data?.data ?? []}
          lowStockLoading={lowStockQuery.isLoading}
        />
      </div>
    </div>
  );
}
