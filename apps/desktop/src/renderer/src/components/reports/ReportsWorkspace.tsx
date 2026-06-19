import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REPORT_METRICS } from '@/constants';
import type { ReportMetric } from '@/types/operations';

function ReportMetricCard({ metric }: { metric: ReportMetric }) {
  return (
    <Card className="motion-press gap-3 border-border/80 bg-surface-raised py-4 hover:border-orange/35 hover:shadow-md">
      <CardHeader className="px-4">
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="nums font-display text-2xl">{metric.value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{metric.detail}</p>
      </CardContent>
    </Card>
  );
}

function renderReportMetric(metric: ReportMetric) {
  return <ReportMetricCard key={metric.label} metric={metric} />;
}

export function ReportsWorkspace() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">{REPORT_METRICS.map(renderReportMetric)}</div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Reporte diario</CardTitle>
                <CardDescription>Ventas netas, pagos, impuestos base y anulaciones</CardDescription>
              </div>
              <Button variant="outline" disabled>
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <div className="grid h-72 grid-cols-7 items-end gap-3 rounded-lg border border-border bg-background/60 px-4 pt-4 pb-3">
              <div className="rounded-t-md bg-orange/35" style={{ height: 96 }} />
              <div className="rounded-t-md bg-orange/45" style={{ height: 122 }} />
              <div className="rounded-t-md bg-orange/60" style={{ height: 148 }} />
              <div className="rounded-t-md bg-orange" style={{ height: 198 }} />
              <div className="rounded-t-md bg-orange/75" style={{ height: 174 }} />
              <div className="rounded-t-md bg-orange/55" style={{ height: 136 }} />
              <div className="rounded-t-md bg-orange/40" style={{ height: 108 }} />
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="gap-4 border-border/80 bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Reportes base</CardTitle>
                  <CardDescription className="text-white/55">Lecturas listas para MVP</CardDescription>
                </div>
                <BarChart3 className="h-5 w-5 text-orange" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="font-medium">Cierre de caja</p>
                <p className="mt-1 text-sm text-white/50">
                  Esperado, contado, diferencia y responsable.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="font-medium">Inventario valorizado</p>
                <p className="mt-1 text-sm text-white/50">
                  Stock, costo promedio y alertas.
                </p>
              </div>
              <Button variant="outline" className="w-full" disabled>
                <FileSpreadsheet className="h-4 w-4" />
                Preparar Excel
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
