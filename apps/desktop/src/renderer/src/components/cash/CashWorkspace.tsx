import { AlertCircle, Banknote, LockKeyhole, Plus, ReceiptText } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CASH_BREAKDOWN, CASH_REGISTER_SUMMARY } from '@/constants';
import type { CashBreakdown } from '@/types/operations';

function CashBreakdownCard({ item }: { item: CashBreakdown }) {
  return (
    <Card className="gap-3 border-border/80 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardDescription>{item.label}</CardDescription>
        <CardTitle className="nums font-display text-xl">{item.amount}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{item.detail}</p>
      </CardContent>
    </Card>
  );
}

function renderCashBreakdown(item: CashBreakdown) {
  return <CashBreakdownCard key={item.label} item={item} />;
}

export function CashWorkspace() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <Card className="gap-5 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Sesion de caja</CardTitle>
                <CardDescription>Responsable, base inicial y diferencias del turno</CardDescription>
              </div>
              <StatusPill tone="green">{CASH_REGISTER_SUMMARY.status}</StatusPill>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Efectivo esperado</p>
                <p className="nums mt-2 font-display text-3xl font-semibold">
                  {CASH_REGISTER_SUMMARY.amount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Base inicial</p>
                <p className="nums mt-2 font-display text-3xl font-semibold">
                  {CASH_REGISTER_SUMMARY.base}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Cajero</p>
                <p className="mt-2 font-display text-3xl font-semibold">
                  {CASH_REGISTER_SUMMARY.cashier}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {CASH_BREAKDOWN.map(renderCashBreakdown)}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <CardTitle>Movimientos recientes</CardTitle>
            <CardDescription>
              Cada movimiento debe quedar auditado por usuario y sede
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-3">
                <ReceiptText className="h-4 w-4 text-orange" />
                <div>
                  <p className="text-sm font-medium">Pago en efectivo</p>
                  <p className="text-xs text-muted-foreground">Ticket POS-0092</p>
                </div>
              </div>
              <p className="nums text-sm font-semibold">$64.000</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-orange" />
                <div>
                  <p className="text-sm font-medium">Retiro para proveedor</p>
                  <p className="text-xs text-muted-foreground">Requiere soporte</p>
                </div>
              </div>
              <p className="nums text-sm font-semibold">-$120.000</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <CardTitle>Cierre de turno</CardTitle>
            <CardDescription>Compara esperado contra contado antes de cerrar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <p className="text-sm">El cierre debe confirmar responsable, diferencia y notas.</p>
              </div>
            </div>
            <Separator />
            <Button className="w-full" disabled>
              <LockKeyhole className="h-4 w-4" />
              Cerrar caja
            </Button>
            <Button variant="outline" className="w-full bg-background" disabled>
              <Plus className="h-4 w-4" />
              Movimiento manual
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
