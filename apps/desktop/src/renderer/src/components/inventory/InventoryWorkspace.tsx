import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Boxes, ClipboardList, Plus } from 'lucide-react';
import { DcChip, KpiCard, type DcChipTone } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/catalog';
import { useInventory, useStockMovements } from '@/hooks/inventory';
import { useActiveBranch } from '@/hooks/tenancy';
import { useAppToast } from '@/hooks/ui';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { InventoryAdjustmentFormValues, InventoryItemFormValues } from '@/schemas/inventory';
import type { InventoryItemDto, StockMovementDto, StockMovementType } from '@/types/inventory';
import { InventoryAdjustmentDialog } from './InventoryAdjustmentDialog';
import { InventoryItemFormDialog } from './InventoryItemFormDialog';

const GRID = 'grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_1fr] items-center gap-3';
const HEADER = 'text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9A9286]';
const ALL_MOVEMENTS = 'ALL';

const MOVEMENT_META: Record<StockMovementType, { label: string; sign: 1 | -1 }> = {
  PURCHASE: { label: 'Compra', sign: 1 },
  RETURN: { label: 'Devolucion', sign: 1 },
  ADJUSTMENT_IN: { label: 'Ajuste +', sign: 1 },
  TRANSFER_IN: { label: 'Traslado +', sign: 1 },
  SALE_CONSUMPTION: { label: 'Venta', sign: -1 },
  ADJUSTMENT_OUT: { label: 'Ajuste -', sign: -1 },
  WASTE: { label: 'Merma', sign: -1 },
  TRANSFER_OUT: { label: 'Traslado -', sign: -1 },
};

const MOVEMENT_TYPES = Object.entries(MOVEMENT_META) as Array<
  [StockMovementType, (typeof MOVEMENT_META)[StockMovementType]]
>;

const movementColumns: ColumnDef<StockMovementDto>[] = [
  {
    accessorKey: 'inventoryItemName',
    header: 'Insumo',
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{row.original.inventoryItemName}</p>
        <p className="nums truncate text-[11px] text-[#9A9286]">
          {formatDateTime(row.original.createdAt)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const meta = MOVEMENT_META[row.original.type];
      return <DcChip tone={meta.sign < 0 ? 'warning' : 'success'}>{meta.label}</DcChip>;
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    meta: { headClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => {
      const meta = MOVEMENT_META[row.original.type];
      const signed = meta.sign * row.original.quantity;
      return (
        <span
          className={cn(
            'nums text-sm font-bold',
            meta.sign < 0 ? 'text-[#C0431A]' : 'text-success',
          )}
        >
          {signed > 0 ? '+' : ''}
          {signed}
        </span>
      );
    },
  },
  {
    accessorKey: 'stockAfter',
    header: 'Stock final',
    meta: { headClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => <span className="nums font-semibold">{row.original.stockAfter}</span>,
  },
  {
    accessorKey: 'totalCost',
    header: 'Costo',
    meta: { headClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => (
      <span className="nums text-[#6B6359]">
        {row.original.totalCost === null ? '-' : formatMoney(row.original.totalCost, 'COP')}
      </span>
    ),
  },
];

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

function ItemRow({
  item,
  onAdjust,
}: {
  item: InventoryItemDto;
  onAdjust: (item: InventoryItemDto) => void;
}) {
  const status = stockStatus(item);
  return (
    <div
      className={cn(
        GRID,
        'min-w-[760px] border-b border-[#F2ECE3] px-[18px] py-[13px] transition-colors hover:bg-surface-quiet/50 md:min-w-0',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="nums truncate text-[11px] text-[#9A9286]">
          SKU inv. {item.sku} · {item.baseUnitCode}
          {item.productSku ? ` · SKU producto ${item.productSku}` : ''}
        </p>
        {item.productName ? (
          <p className="truncate text-[11px] text-[#6B6359]">{item.productName}</p>
        ) : null}
      </div>
      <p className="nums text-right text-[13.5px] font-bold">
        {item.stockOnHand} {item.baseUnitCode}
      </p>
      <p className="nums text-right text-[12.5px] text-[#6B6359]">{item.minimumStock}</p>
      <p className="nums text-right text-[12.5px] text-[#6B6359]">
        {formatMoney(item.averageCost, 'COP')}
      </p>
      <div className="flex justify-end gap-2">
        <DcChip tone={status.tone}>{status.label}</DcChip>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 px-3 text-xs"
          data-cy="inventory-adjust-row"
          onClick={() => onAdjust(item)}
        >
          Ajustar
        </Button>
      </div>
    </div>
  );
}

function InventoryItemCard({
  item,
  onAdjust,
}: {
  item: InventoryItemDto;
  onAdjust: (item: InventoryItemDto) => void;
}) {
  const status = stockStatus(item);

  return (
    <div
      className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm"
      data-cy="inventory-mobile-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
          <p className="nums mt-0.5 truncate text-[11.5px] text-muted-foreground">
            SKU inv. {item.sku} - {item.baseUnitCode}
          </p>
        </div>
        <DcChip tone={status.tone}>{status.label}</DcChip>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-background px-3 py-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Stock</p>
          <p className="nums mt-1 text-[13px] font-bold">
            {item.stockOnHand} {item.baseUnitCode}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Minimo</p>
          <p className="nums mt-1 text-[13px] font-bold">{item.minimumStock}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Costo</p>
          <p className="nums mt-1 text-[13px] font-bold">{formatMoney(item.averageCost, 'COP')}</p>
        </div>
      </div>

      {item.productName ? (
        <p className="mt-3 truncate rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
          Producto: {item.productName}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="mt-4 min-h-11 w-full"
        data-cy="inventory-adjust-row"
        onClick={() => onAdjust(item)}
      >
        Ajustar stock
      </Button>
    </div>
  );
}

function MovementCard(movement: StockMovementDto) {
  const meta = MOVEMENT_META[movement.type];
  const signed = meta.sign * movement.quantity;

  return (
    <div
      className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm"
      data-cy="movement-mobile-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{movement.inventoryItemName}</p>
          <p className="nums mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {formatDateTime(movement.createdAt)}
          </p>
        </div>
        <DcChip tone={meta.sign < 0 ? 'warning' : 'success'}>{meta.label}</DcChip>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-background px-3 py-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Cantidad</p>
          <p
            className={cn(
              'nums mt-1 text-[13px] font-bold',
              meta.sign < 0 ? 'text-[#C0431A]' : 'text-success',
            )}
          >
            {signed > 0 ? '+' : ''}
            {signed}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Stock final</p>
          <p className="nums mt-1 text-[13px] font-bold">{movement.stockAfter}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Costo</p>
          <p className="nums mt-1 text-[13px] font-bold">
            {movement.totalCost === null ? '-' : formatMoney(movement.totalCost, 'COP')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InventoryWorkspace() {
  const toast = useAppToast();
  const activeBranch = useActiveBranch();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemDto | null>(null);
  const { itemsQuery, categoriesQuery, createMutation, adjustMutation } = useInventory();
  const products = useProducts({ page: 1, pageSize: 100, isActive: true });
  const stockMovements = useStockMovements();
  const items = itemsQuery.data?.data ?? [];
  const movementsPage = stockMovements.query.data;
  const movements = movementsPage?.data ?? [];
  const total = itemsQuery.data?.meta.total ?? items.length;
  const activeBranchId = activeBranch?.id ?? null;

  const stats = useMemo(() => {
    const low = items.filter(isLow).length;
    const out = items.filter((item) => item.stockOnHand <= 0).length;
    const value = items.reduce((sum, item) => sum + item.stockOnHand * item.averageCost, 0);
    return { low, out, value };
  }, [items]);

  const lowItems = useMemo(() => items.filter(isLow).slice(0, 8), [items]);

  const createItem = async (values: InventoryItemFormValues) => {
    try {
      await createMutation.mutateAsync({
        branchId: values.branchId,
        categoryId: values.categoryId,
        name: values.name,
        baseUnitCode: values.baseUnitCode,
        baseUnitName: values.baseUnitName,
        productId: values.productId || null,
        initialStock: values.initialStock,
        initialUnitCost: values.initialStock > 0 ? values.initialUnitCost : undefined,
        minimumStock: values.minimumStock,
        allowNegativeStock: values.allowNegativeStock,
      });
      toast.success('Insumo creado', 'Ya aparece en el inventario de la sede.');
    } catch (error) {
      toast.error('No se pudo crear el insumo', errorMessage(error));
      throw error;
    }
  };

  const openAdjustment = (item: InventoryItemDto) => {
    setSelectedItem(item);
    setAdjustmentDialogOpen(true);
  };

  const adjustStock = async (values: InventoryAdjustmentFormValues) => {
    if (!selectedItem) {
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        id: selectedItem.id,
        payload: {
          type: values.type,
          quantity: values.quantity,
          reason: values.reason,
          unitCost: values.type === 'IN' ? values.unitCost : undefined,
        },
      });
      toast.success('Stock ajustado', `${selectedItem.name} quedo actualizado.`);
    } catch (error) {
      toast.error('No se pudo ajustar el stock', errorMessage(error));
      throw error;
    }
  };

  return (
    <>
      <div
        className="mx-auto grid max-w-[1320px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
        data-cy="inventory-page"
      >
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Insumos" value={total} hint="Registrados en inventario" />
            <KpiCard
              label="Bajo minimo"
              value={stats.low}
              hint="Requieren compra"
              accent="warning"
            />
            <KpiCard label="Agotados" value={stats.out} hint="Sin existencias" accent="danger" />
            <KpiCard
              label="Valor de inventario"
              value={formatMoney(stats.value, 'COP')}
              hint="Stock x costo prom."
            />
          </div>

          <Card className="gap-4 rounded-2xl border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Stock operativo</CardTitle>
                  <CardDescription>Existencias reales y minimos por sede</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={!selectedItem}
                    onClick={() => selectedItem && setAdjustmentDialogOpen(true)}
                  >
                    <ClipboardList className="size-4" />
                    Ajuste
                  </Button>
                  <Button
                    disabled={!activeBranchId}
                    data-cy="inventory-new-item"
                    onClick={() => setItemDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                    Insumo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="grid gap-3 p-3 md:hidden">
                  {itemsQuery.isLoading
                    ? [0].map((row) => (
                        <div
                          key={row}
                          className="rounded-2xl border border-border bg-surface-raised p-4"
                        >
                          <Skeleton className="h-5 w-2/3" />
                          <Skeleton className="mt-3 h-4 w-full" />
                          <Skeleton className="mt-2 h-4 w-1/2" />
                        </div>
                      ))
                    : null}
                  {!itemsQuery.isLoading && items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-5 py-10 text-center text-sm text-muted-foreground">
                      Aun no hay insumos en inventario. Crea el primero o recibe una compra.
                    </div>
                  ) : null}
                  {!itemsQuery.isLoading
                    ? items.map((item) => (
                        <InventoryItemCard key={item.id} item={item} onAdjust={openAdjustment} />
                      ))
                    : null}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <div
                    className={cn(
                      GRID,
                      'min-w-[760px] border-b border-border bg-surface-quiet/60 px-[18px] py-3 md:min-w-0',
                    )}
                  >
                    <span className={HEADER}>Insumo</span>
                    <span className={cn(HEADER, 'text-right')}>Stock</span>
                    <span className={cn(HEADER, 'text-right')}>Minimo</span>
                    <span className={cn(HEADER, 'text-right')}>Costo prom.</span>
                    <span className={cn(HEADER, 'text-right')}>Estado</span>
                  </div>
                  <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
                    {itemsQuery.isLoading
                      ? [0].map((row) => (
                          <div key={row} className="border-b border-[#F2ECE3] px-[18px] py-[15px]">
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ))
                      : null}
                    {!itemsQuery.isLoading && items.length === 0 ? (
                      <div className="px-[18px] py-12 text-center text-sm text-muted-foreground">
                        Aun no hay insumos en inventario. Crea el primero o recibe una compra.
                      </div>
                    ) : null}
                    {!itemsQuery.isLoading
                      ? items.map((item) => (
                          <div key={item.id} data-cy="inventory-item-row">
                            <ItemRow item={item} onAdjust={openAdjustment} />
                          </div>
                        ))
                      : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 rounded-2xl border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Kardex</CardTitle>
                  <CardDescription>
                    Entradas, salidas y ajustes de stock por insumo, con fecha y saldo final.
                  </CardDescription>
                </div>
                <Select
                  value={stockMovements.params.type ?? ALL_MOVEMENTS}
                  onValueChange={(value) =>
                    stockMovements.setType(
                      value === ALL_MOVEMENTS ? undefined : (value as StockMovementType),
                    )
                  }
                >
                  <SelectTrigger
                    className="w-full bg-background sm:w-[210px]"
                    aria-label="Filtrar movimientos de Kardex"
                  >
                    <SelectValue placeholder="Filtrar movimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MOVEMENTS}>Todos los movimientos</SelectItem>
                    {MOVEMENT_TYPES.map(([type, meta]) => (
                      <SelectItem key={type} value={type}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-5">
              <DataTable
                columns={movementColumns}
                data={movements}
                isLoading={stockMovements.query.isLoading}
                emptyMessage="Aun no hay movimientos registrados."
                sorting={stockMovements.sorting}
                onSortingChange={stockMovements.setSorting}
                manualSorting
                mobileCard={MovementCard}
                pagination={
                  movementsPage
                    ? {
                        pageIndex: movementsPage.meta.page - 1,
                        pageCount: movementsPage.meta.totalPages,
                        total: movementsPage.meta.total,
                        pageSize: movementsPage.meta.pageSize,
                        onPageChange: stockMovements.setPage,
                      }
                    : {
                        pageIndex: (stockMovements.params.page ?? 1) - 1,
                        pageCount: 1,
                        total: 0,
                        pageSize: stockMovements.params.pageSize ?? 15,
                        onPageChange: stockMovements.setPage,
                      }
                }
              />
            </CardContent>
          </Card>
        </section>

        <aside>
          <Card className="gap-4 rounded-2xl border-transparent bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Alertas de stock</CardTitle>
                  <CardDescription className="text-white/55">
                    Reabastecimiento recomendado
                  </CardDescription>
                </div>
                <Boxes className="size-5 text-orange" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              {itemsQuery.isLoading ? (
                [0].map((row) => <Skeleton key={row} className="h-14 w-full bg-white/10" />)
              ) : lowItems.length === 0 ? (
                <p className="text-sm text-white/55">
                  Todo el inventario esta por encima del minimo.
                </p>
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
                          Actual {item.stockOnHand} · Minimo {item.minimumStock}
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

      <InventoryItemFormDialog
        branchId={activeBranchId}
        categories={categoriesQuery.data ?? []}
        products={products.listQuery.data?.data ?? []}
        categoriesLoading={categoriesQuery.isLoading}
        productsLoading={products.listQuery.isLoading}
        isSubmitting={createMutation.isPending}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        onSubmit={createItem}
      />
      <InventoryAdjustmentDialog
        item={selectedItem}
        isSubmitting={adjustMutation.isPending}
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        onSubmit={adjustStock}
      />
    </>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Intenta nuevamente.';
}
