import type { ColumnDef } from '@tanstack/react-table';
import { Boxes, CircleDollarSign } from 'lucide-react';
import type { SalesSummaryTopProduct } from '@gastroai/contracts';
import { StatusPill } from '@/components/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { CashSessionDto } from '@/types/cash';
import type { InventoryItemDto } from '@/types/inventory';

const topProductColumns: ColumnDef<SalesSummaryTopProduct>[] = [
  {
    accessorKey: 'name',
    header: 'Producto',
    cell: ({ row }) => <span className="text-sm font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: 'quantity',
    header: 'Cant.',
    meta: { headClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => <span className="nums font-bold">{row.original.quantity}</span>,
  },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: { headClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => <span className="nums">{formatMoney(row.original.total, 'COP')}</span>,
  },
];

const lowStockColumns: ColumnDef<InventoryItemDto>[] = [
  {
    accessorKey: 'name',
    header: 'Insumo',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-semibold">{row.original.name}</p>
        <p className="nums text-[11px] text-muted-foreground">{row.original.sku}</p>
      </div>
    ),
  },
  {
    accessorKey: 'stockOnHand',
    header: 'Stock',
    meta: { headClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => (
      <span className="nums font-bold">
        {row.original.stockOnHand} {row.original.baseUnitCode}
      </span>
    ),
  },
];

export function DashboardSidePanel({
  cashSession,
  cashLoading,
  topProducts,
  topProductsLoading,
  lowStockItems,
  lowStockLoading,
}: {
  cashSession: CashSessionDto | null | undefined;
  cashLoading: boolean;
  topProducts: SalesSummaryTopProduct[];
  topProductsLoading: boolean;
  lowStockItems: InventoryItemDto[];
  lowStockLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="gap-4 rounded-2xl border-transparent bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
        <CardHeader className="px-5 pb-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription className="font-semibold text-white/62">Caja activa</CardDescription>
              <CardTitle className="nums mt-2 font-display text-[28px] font-bold text-white">
                {cashLoading ? (
                  <Skeleton className="h-8 w-36 bg-white/10" />
                ) : cashSession ? (
                  formatMoney(cashSession.expectedAmount ?? cashSession.openingBalance, cashSession.currency)
                ) : (
                  'Cerrada'
                )}
              </CardTitle>
            </div>
            <StatusPill
              tone={cashSession ? 'green' : 'neutral'}
              className={
                cashSession
                  ? 'h-6 border-success/20 bg-success/20 px-2 text-[10px] font-bold uppercase text-success-soft'
                  : 'h-6 px-2 text-[10px] font-bold uppercase'
              }
            >
              {cashSession ? 'Abierta' : 'Cerrada'}
            </StatusPill>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <Separator className="bg-white/10" />
          {cashSession ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[12px] text-white/45">Base</p>
                <p className="nums mt-1 font-bold">{formatMoney(cashSession.openingBalance, cashSession.currency)}</p>
              </div>
              <div>
                <p className="text-[12px] text-white/45">Apertura</p>
                <p className="nums mt-1 font-bold">{formatDateTime(cashSession.openedAt)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/62">
              <CircleDollarSign className="size-4 text-orange" />
              Abre caja para registrar cobros en efectivo.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
        <CardHeader className="px-5 pb-0">
          <CardTitle>Top del dia</CardTitle>
          <CardDescription>Productos vendidos segun reportes reales</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <DataTable
            columns={topProductColumns}
            data={topProducts}
            isLoading={topProductsLoading}
            emptyMessage="Sin productos vendidos hoy."
            mobileCard={(product) => (
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold">{product.name}</p>
                  <span className="nums shrink-0 text-sm font-bold">x{product.quantity}</span>
                </div>
                <p className="nums mt-2 text-sm text-muted-foreground">
                  {formatMoney(product.total, 'COP')}
                </p>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
        <CardHeader className="px-5 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bajo stock</CardTitle>
              <CardDescription>Insumos bajo minimo</CardDescription>
            </div>
            <Boxes className="size-5 text-orange" />
          </div>
        </CardHeader>
        <CardContent className="px-5">
          <DataTable
            columns={lowStockColumns}
            data={lowStockItems}
            isLoading={lowStockLoading}
            emptyMessage="Sin alertas de inventario."
            mobileCard={(item) => (
              <div className="rounded-xl border border-border bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="nums mt-1 text-[11px] text-muted-foreground">{item.sku}</p>
                  </div>
                  <span className="nums shrink-0 text-sm font-bold">
                    {item.stockOnHand} {item.baseUnitCode}
                  </span>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
