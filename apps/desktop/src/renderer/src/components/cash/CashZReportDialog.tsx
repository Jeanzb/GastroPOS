import { AlertCircle, Loader2, Printer, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib';
import type { CashMovementType, CashZReportDto, CashZReportPaymentMethod } from '@/types/cash';

const METHOD_LABELS: Record<CashZReportPaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  OPENING_BALANCE: 'Base inicial',
  CASH_IN: 'Entrada de efectivo',
  CASH_OUT: 'Salida de efectivo',
  SALE_PAYMENT: 'Pago en efectivo',
  REFUND: 'Devolucion',
  TIP: 'Propina',
  ADJUSTMENT: 'Ajuste',
};

interface CashZReportDialogProps {
  open: boolean;
  report: CashZReportDto | undefined;
  isLoading: boolean;
  isError: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Sin cierre';
  }
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-destructive' : 'text-foreground';

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`nums mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function CashZReportDialog({
  open,
  report,
  isLoading,
  isError,
  onOpenChange,
  onRetry,
}: CashZReportDialogProps) {
  const differenceTone = (report?.difference ?? 0) < 0 ? 'danger' : 'success';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" data-cy="cash-z-report-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-orange" />
            Reporte Z
          </DialogTitle>
          <DialogDescription>
            Cierre operativo de caja. No reemplaza certificacion fiscal DIAN.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3" data-cy="cash-z-report-loading">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div
            className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-danger-soft p-4 text-sm text-destructive"
            data-cy="cash-z-report-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-semibold">No se pudo cargar el Reporte Z.</p>
              <p>Verifica la conexion y vuelve a intentarlo.</p>
            </div>
          </div>
        ) : null}

        {!isLoading && !isError && report ? (
          <div className="space-y-5" data-cy="cash-z-report-content">
            <section className="rounded-xl border border-border bg-carbon p-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    {report.branchCode}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-bold">{report.branchName}</h3>
                  <p className="mt-1 text-sm text-white/60">
                    {formatDateTime(report.openedAt)} - {formatDateTime(report.closedAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
                  <p className="text-xs text-white/50">Sesion</p>
                  <p className="nums text-sm font-semibold">#{report.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <Stat label="Base inicial" value={formatMoney(report.openingBalance, report.currency)} />
              <Stat label="Esperado" value={formatMoney(report.expectedAmount, report.currency)} />
              <Stat
                label="Contado"
                value={formatMoney(report.countedAmount ?? 0, report.currency)}
              />
              <Stat
                label="Diferencia"
                value={formatMoney(report.difference ?? 0, report.currency)}
                tone={differenceTone}
              />
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <Stat label="Ventas" value={formatMoney(report.totalSales, report.currency)} />
              <Stat label="Tickets" value={String(report.ticketCount)} />
              <Stat label="Ticket promedio" value={formatMoney(report.averageTicket, report.currency)} />
              <Stat label="Facturas solicitadas" value={String(report.invoicedCount)} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <h4 className="font-display text-base font-bold">Pagos por metodo</h4>
                <div className="mt-3 space-y-2">
                  {report.byMethod.length > 0 ? (
                    report.byMethod.map((method) => (
                      <div key={method.method} className="flex items-center justify-between text-sm">
                        <span>{METHOD_LABELS[method.method]}</span>
                        <span className="nums font-semibold">
                          {formatMoney(method.amount, report.currency)} - {method.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <h4 className="font-display text-base font-bold">Top productos</h4>
                <div className="mt-3 space-y-2">
                  {report.topProducts.length > 0 ? (
                    report.topProducts.map((product) => (
                      <div key={product.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{product.name}</span>
                        <span className="nums shrink-0 font-semibold">
                          x{product.quantity} - {formatMoney(product.total, report.currency)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin productos vendidos.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h4 className="font-display text-base font-bold">Movimientos manuales</h4>
              <div className="mt-3 space-y-2">
                {report.movements.length > 0 ? (
                  report.movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {MOVEMENT_LABELS[movement.type]} - {movement.reference ?? movement.notes ?? 'Sin detalle'}
                      </span>
                      <span className="nums shrink-0 font-semibold">
                        {formatMoney(movement.signedAmount, report.currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hubo movimientos manuales.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        <DialogFooter>
          {isError ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => window.print()} disabled={!report}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Imprimir
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
