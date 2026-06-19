import { useMemo } from 'react';
import { Boxes, ClipboardList, Plus } from 'lucide-react';
import { DcChip, KpiCard, type DcChipTone } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventory } from '@/hooks/inventory';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { InventoryItemDto, StockMovementDto, StockMovementType } from '@/types/inventory';

const GRID = 'grid grid-cols-[1.6fr_0.7fr_0.7fr_0.9fr_0.8fr] items-center gap-3';
const HEADER = 'text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9A9286]';

const MOVEMENT_META: Record<StockMovementType, { label: string; sign: 1 | -1 }> = {
  PURCHASE: { label: 'Compra', sign: 1 },
  RETURN: { label: 'Devolución', sign: 1 },
  ADJUSTMENT_IN: { label: 'Ajuste +', sign: 1 },
  TRANSFER_IN: { label: 'Traslado +', sign: 1 },
  SALE_CONSUMPTION: { label: 'Venta', sign: -1 },
  ADJUSTMENT_OUT: { label: 'Ajuste −', sign: -1 },
  WASTE: { label: 'Merma', sign: -1 },
  TRANSFER_OUT: { label: 'Traslado −', sign: -1 },
};

function stockStatus(item: InventoryItemDto): { label: string; tone: DcChipTone } {
  if (item.stockOnHand <= 0) {
    return { label: 'Agotado', tone: 'danger' };
  }
  if (item.minimumStock > 0 && item.stockOnHand <= item.minimumStock) {
    return { label: 'Bajo', tone: 'warning' };
  }
  return { label: 'Normal', tone: 'success' };
}

function isLow(item: InventoryItemDto): boolean {
  return item.stockOnHand <= 0 || (item.minimumStock > 0 && item.stockOnHand <= item.minimumStock);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

function ItemRow({ item }: { item: InventoryItemDto }) {
  const status = stockStatus(item);
  return (
    <div className={cn(GRID, 'border-b border-[#F2ECE3] px-[18px] py-[13px] transition-colors hover:bg-surface-quiet/50')}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="nums truncate text-[11px] text-[#9A9286]">{item.sku ?? 'Sin SKU'}</p>
      </div>
      <p className="nums text-right text-[13.5px] font-bold">{item.stockOnHand}</p>
      <p className="nums text-right text-[12.5px] text-[#6B6359]">{item.minimumStock}</p>
      <p className="nums text-right text-[12.5px] text-[#6B6359]">
        {formatMoney(item.averageCost, 'COP')}
      </p>
      <div className="flex justify-end">
        <DcChip tone={status.tone}>{status.label}</DcChip>
      </div>
    </div>
  );
}

function MovementRow({ movement }: { movement: StockMovementDto }) {
  const meta = MOVEMENT_META[movement.type];
  const signed = meta.sign * movement.quantity;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#F2ECE3] px-[18px] py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">{movement.inventoryItemName}</p>
        <p className="nums truncate text-[11px] text-[#9A9286]">
          {meta.label} · {formatDateTime(movement.createdAt)}
        </p>
      </div>
      <span className={cn('nums shrink-0 text-sm font-bold', meta.sign < 0 ? 'text-[#C0431A]' : 'text-success')}>
        {signed > 0 ? '+' : ''}
        {signed}
      </span>
    </div>
  );
}

export function InventoryWorkspace() {
  const { itemsQuery, movementsQuery } = useInventory();
  const items = itemsQuery.data?.data ?? [];
  const movements = movementsQuery.data?.data ?? [];
  const total = itemsQuery.data?.meta.total ?? items.length;

  const stats = useMemo(() => {
    const low = items.filter(isLow).length;
    const out = items.filter((item) => item.stockOnHand <= 0).length;
    const value = items.reduce((sum, item) => sum + item.stockOnHand * item.averageCost, 0);
    return { low, out, value };
  }, [items]);

  const lowItems = useMemo(() => items.filter(isLow).slice(0, 8), [items]);

  return (
    <div className="mx-auto grid max-w-[1320px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Insumos" value={total} hint="Registrados en inventario" />
          <KpiCard label="Bajo mínimo" value={stats.low} hint="Requieren compra" accent="warning" />
          <KpiCard label="Agotados" value={stats.out} hint="Sin existencias" accent="danger" />
          <KpiCard label="Valor de inventario" value={formatMoney(stats.value, 'COP')} hint="Stock × costo prom." />
        </div>

        <Card className="gap-4 rounded-2xl border-border/80 bg-surface-raised py-5 shadow-sm">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Stock operativo</CardTitle>
                <CardDescription>Existencias reales y mínimos por sede</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled title="Próximamente">
                  <ClipboardList className="size-4" />
                  Ajuste
                </Button>
                <Button disabled title="Próximamente">
                  <Plus className="size-4" />
                  Insumo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className={cn(GRID, 'border-b border-border bg-surface-quiet/60 px-[18px] py-3')}>
                <span className={HEADER}>Insumo</span>
                <span className={cn(HEADER, 'text-right')}>Stock</span>
                <span className={cn(HEADER, 'text-right')}>Mínimo</span>
                <span className={cn(HEADER, 'text-right')}>Costo prom.</span>
                <span className={cn(HEADER, 'text-right')}>Estado</span>
              </div>
              <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
                {itemsQuery.isLoading
                  ? [0, 1, 2, 3, 4].map((row) => (
                      <div key={row} className="border-b border-[#F2ECE3] px-[18px] py-[15px]">
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))
                  : null}
                {!itemsQuery.isLoading && items.length === 0 ? (
                  <div className="px-[18px] py-12 text-center text-sm text-muted-foreground">
                    Aún no hay insumos en inventario. El stock se mueve al recibir compras y cobrar ventas.
                  </div>
                ) : null}
                {!itemsQuery.isLoading ? items.map((item) => <ItemRow key={item.id} item={item} />) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4 rounded-2xl border-border/80 bg-surface-raised py-5 shadow-sm">
          <CardHeader className="px-5">
            <CardTitle>Kardex reciente</CardTitle>
            <CardDescription>Nunca se actualiza stock sin movimiento trazable</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {movementsQuery.isLoading ? (
              <div className="space-y-2 px-5">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-10 w-full" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">Aún no hay movimientos registrados.</p>
            ) : (
              <div>
                {movements.map((movement) => (
                  <MovementRow key={movement.id} movement={movement} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <aside>
        <Card className="gap-4 rounded-2xl border-transparent bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
          <CardHeader className="px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-white">Alertas de stock</CardTitle>
                <CardDescription className="text-white/55">Reabastecimiento recomendado</CardDescription>
              </div>
              <Boxes className="size-5 text-orange" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5">
            {itemsQuery.isLoading ? (
              [0, 1, 2].map((row) => <Skeleton key={row} className="h-14 w-full bg-white/10" />)
            ) : lowItems.length === 0 ? (
              <p className="text-sm text-white/55">Todo el inventario está por encima del mínimo.</p>
            ) : (
              lowItems.map((item) => {
                const status = stockStatus(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                      <p className="nums mt-1 text-xs text-white/50">
                        Actual {item.stockOnHand} · Mínimo {item.minimumStock}
                      </p>
                    </div>
                    <DcChip tone={status.tone}>{status.label}</DcChip>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
