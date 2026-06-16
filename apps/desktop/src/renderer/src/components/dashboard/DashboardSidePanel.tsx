import { AlertTriangle, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CASH_REGISTER_SUMMARY, FISCAL_SUMMARY, TOP_PRODUCTS } from '@/constants';
import type { TopProduct } from '@/types/operations';

function TopProductRow({ product }: { product: TopProduct }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-sm font-medium">{product.name}</span>
      <span className="nums text-sm text-muted-foreground">{product.quantity}</span>
    </div>
  );
}

function renderTopProduct(product: TopProduct) {
  return <TopProductRow key={product.name} product={product} />;
}

export function DashboardSidePanel() {
  return (
    <div className="space-y-4">
      <Card className="gap-4 border-border/80 py-5 shadow-none">
        <CardHeader className="px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Caja activa</CardTitle>
              <CardDescription>Turno de caja principal</CardDescription>
            </div>
            <StatusPill tone="green">{CASH_REGISTER_SUMMARY.status}</StatusPill>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Efectivo esperado</p>
              <p className="nums font-display text-2xl font-semibold">
                {CASH_REGISTER_SUMMARY.amount}
              </p>
            </div>
            <CircleDollarSign className="h-8 w-8 text-orange" />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Base</p>
              <p className="nums font-medium">{CASH_REGISTER_SUMMARY.base}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Apertura</p>
              <p className="nums font-medium">{CASH_REGISTER_SUMMARY.openedAt}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 border-border/80 py-5 shadow-none">
        <CardHeader className="px-5">
          <CardTitle>Facturacion electronica</CardTitle>
          <CardDescription>Estado de documentos fiscales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Aceptadas
            </span>
            <span className="nums font-semibold">{FISCAL_SUMMARY.emitted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              En cola
            </span>
            <span className="nums font-semibold">{FISCAL_SUMMARY.queued}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Rechazadas
            </span>
            <span className="nums font-semibold">{FISCAL_SUMMARY.rejected}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 border-border/80 py-5 shadow-none">
        <CardHeader className="px-5">
          <CardTitle>Top del dia</CardTitle>
          <CardDescription>Productos con mas rotacion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-5">{TOP_PRODUCTS.map(renderTopProduct)}</CardContent>
      </Card>
    </div>
  );
}
