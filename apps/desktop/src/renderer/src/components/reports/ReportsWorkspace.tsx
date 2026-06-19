import { BarChart3, Download, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import { KpiCard } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useReports } from '@/hooks/reports';
import { formatDateTime, formatMoney, formatOperationalDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReportPaymentMethod, SalesSummaryDto } from '@/types/reports';

const METHOD_LABELS: Record<ReportPaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatRange(summary: SalesSummaryDto): string {
  const from = formatDateTime(summary.from, summary.timezone);
  const to = formatDateTime(summary.to, summary.timezone);

  return `${from} - ${to}`;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4" data-cy="reports-loading">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[380px] rounded-xl" />
    </div>
  );
}

function EmptyReportState() {
  return (
    <div className="grid h-72 place-items-center rounded-lg border border-dashed border-border bg-background/60 p-6 text-center">
      <div>
        <p className="font-semibold">Aun no hay ventas cerradas en este rango.</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Cuando el POS cierre tickets, este reporte mostrara ventas, pagos, productos y facturacion
          del dia.
        </p>
      </div>
    </div>
  );
}

function HourlySalesChart({ summary }: { summary: SalesSummaryDto }) {
  if (summary.byHour.length === 0) {
    return <EmptyReportState />;
  }

  const maxAmount = Math.max(...summary.byHour.map((point) => point.amount), 1);

  return (
    <div
      className="grid h-72 items-end gap-3 rounded-lg border border-border bg-background/60 px-4 pt-4 pb-3"
      style={{ gridTemplateColumns: `repeat(${summary.byHour.length}, minmax(42px, 1fr))` }}
    >
      {summary.byHour.map((point) => {
        const height = Math.max(12, Math.round((point.amount / maxAmount) * 220));
        return (
          <div key={point.hour} className="flex h-full flex-col justify-end gap-2">
            <div
              className="rounded-t-md bg-orange shadow-sm shadow-orange/20 transition-[height]"
              style={{ height }}
              title={`${formatHour(point.hour)} - ${formatMoney(point.amount, summary.currency)}`}
            />
            <p className="nums text-center text-[11px] text-muted-foreground">
              {formatHour(point.hour)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function PaymentMethods({ summary }: { summary: SalesSummaryDto }) {
  if (summary.byMethod.length === 0) {
    return <p className="text-sm text-white/55">Sin pagos registrados en el rango.</p>;
  }

  return (
    <div className="space-y-3">
      {summary.byMethod.map((method) => (
        <div
          key={method.method}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4"
        >
          <div>
            <p className="font-medium">{METHOD_LABELS[method.method]}</p>
            <p className="mt-1 text-sm text-white/50">{method.count} pagos</p>
          </div>
          <p className="nums font-display text-lg font-bold">
            {formatMoney(method.amount, summary.currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

function TopProducts({ summary }: { summary: SalesSummaryDto }) {
  if (summary.topProducts.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin productos vendidos todavia.</p>;
  }

  return (
    <div className="space-y-2">
      {summary.topProducts.map((product, index) => (
        <div
          key={product.name}
          className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background/70 px-3 py-2.5"
        >
          <span className="nums text-xs text-muted-foreground">{index + 1}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="nums text-xs text-muted-foreground">{product.quantity} uds.</p>
          </div>
          <p className="nums text-sm font-bold">{formatMoney(product.total, summary.currency)}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportsWorkspace() {
  const { summaryQuery } = useReports();
  const summary = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return <ReportsSkeleton />;
  }

  if (summaryQuery.isError || !summary) {
    return (
      <Card className="border-border/80 bg-surface-raised shadow-sm" data-cy="reports-error">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">No se pudo cargar el reporte.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifica la API y vuelve a intentar.
            </p>
          </div>
          <Button onClick={() => void summaryQuery.refetch()}>
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasSales = summary.ticketCount > 0;

  return (
    <div className="space-y-4" data-cy="reports-page">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas cerradas"
          value={formatMoney(summary.totalSales, summary.currency)}
          hint={formatRange(summary)}
        />
        <KpiCard label="Tickets" value={summary.ticketCount} hint="Ventas cerradas" />
        <KpiCard
          label="Ticket promedio"
          value={formatMoney(summary.averageTicket, summary.currency)}
          hint={`${summary.itemsSold} productos vendidos`}
        />
        <KpiCard
          label="Facturacion"
          value={summary.invoicedCount}
          hint="Tickets con factura electronica"
          accent={summary.invoicedCount > 0 ? 'success' : 'default'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Reporte diario</CardTitle>
                <CardDescription>
                  Ventas reales cerradas, pagos, productos y facturacion base
                </CardDescription>
                <p className="mt-2 text-xs text-muted-foreground">
                  Día operativo {formatOperationalDate(summary.operationalDate)} -{' '}
                  {summary.timezone} - corte{' '}
                  {String(summary.businessDayStartsAtHour).padStart(2, '0')}:00
                </p>
              </div>
              <Button variant="outline" disabled title="Proximamente">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <HourlySalesChart summary={summary} />
            {!hasSales ? null : (
              <div
                className={cn(
                  'rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground',
                )}
              >
                Rango consultado:{' '}
                <span className="font-medium text-foreground">{formatRange(summary)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="gap-4 border-border/80 bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Pagos del rango</CardTitle>
                  <CardDescription className="text-white/55">
                    Distribucion por metodo de pago
                  </CardDescription>
                </div>
                <BarChart3 className="h-5 w-5 text-orange" />
              </div>
            </CardHeader>
            <CardContent className="px-5">
              <PaymentMethods summary={summary} />
            </CardContent>
          </Card>

          <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <CardTitle>Top productos</CardTitle>
              <CardDescription>Productos con mayor venta en el rango</CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <TopProducts summary={summary} />
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" disabled title="Proximamente">
            <FileSpreadsheet className="h-4 w-4" />
            Preparar Excel
          </Button>
        </aside>
      </div>
    </div>
  );
}
