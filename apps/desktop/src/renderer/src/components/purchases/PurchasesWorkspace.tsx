import { useMemo, useState, type ChangeEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Plus,
  ReceiptText,
  Search,
  Store,
  XCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DcChip, KpiCard, type DcChipTone } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePurchases, useSuppliers } from '@/hooks/purchases';
import { useAppToast } from '@/hooks/ui';
import { formatDate, formatMoney } from '@/lib/format';
import type { PurchaseFormValues } from '@/schemas/purchases';
import type { SupplierFormValues } from '@/schemas/suppliers';
import type { PurchaseDto, PurchaseStatus } from '@/types/purchases';
import type { SupplierDto } from '@/types/suppliers';
import { PurchaseFormDialog } from './PurchaseFormDialog';
import { SupplierFormDialog } from './SupplierFormDialog';

type PurchaseAction = { type: 'receive' | 'cancel'; purchase: PurchaseDto };

const EMPTY_PURCHASES: PurchaseDto[] = [];
const EMPTY_SUPPLIERS: SupplierDto[] = [];
const SKELETON_ROWS = [0, 1, 2, 3, 4];

function formatPeriodLabel(period?: string): string {
  if (!period) {
    return 'Mes actual';
  }
  const [year, month] = period.split('-').map(Number);
  const label = new Date(year, (month ?? 1) - 1, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const STATUS_META: Record<PurchaseStatus, { label: string; tone: DcChipTone }> = {
  DRAFT: { label: 'Por recibir', tone: 'warning' },
  RECEIVED: { label: 'Recibida', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function normalizeOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toPurchasePayload(values: PurchaseFormValues) {
  return {
    supplierId: values.supplierId,
    reference: normalizeOptional(values.reference),
    notes: normalizeOptional(values.notes),
    taxTotal: values.taxTotal,
    items: [
      {
        name: values.itemName.trim(),
        quantity: values.quantity,
        unitCost: values.unitCost,
      },
    ],
  };
}

function toSupplierPayload(values: SupplierFormValues) {
  return {
    name: values.name.trim(),
    documentNumber: normalizeOptional(values.documentNumber),
    email: normalizeOptional(values.email),
    phone: normalizeOptional(values.phone),
    address: normalizeOptional(values.address),
  };
}

function PurchaseRowItem({
  purchase,
  onReceive,
  onCancel,
}: {
  purchase: PurchaseDto;
  onReceive: (purchase: PurchaseDto) => void;
  onCancel: (purchase: PurchaseDto) => void;
}) {
  const status = STATUS_META[purchase.status];
  const canMutate = purchase.status === 'DRAFT';
  const firstItem = purchase.items[0]?.name ?? 'Sin items';

  return (
    <div
      className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-3 border-b border-[#F2ECE3] px-[18px] py-4 last:border-b-0"
      data-cy="purchase-row"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{purchase.supplierName}</p>
        <p className="mt-1 truncate text-[12px] text-[#6B6359]">{firstItem}</p>
      </div>
      <p className="nums truncate text-[12px] font-semibold text-[#6B6359]">
        {purchase.reference ?? 'Sin doc.'}
      </p>
      <p className="nums text-[13px] font-bold">{formatMoney(purchase.total, purchase.currency)}</p>
      <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6359]">
        <CalendarDays className="size-3.5" />
        {formatDate(purchase.createdAt)}
      </span>
      <DcChip tone={status.tone}>{status.label}</DcChip>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Marcar recibida"
          data-cy="purchase-receive"
          disabled={!canMutate}
          onClick={() => onReceive(purchase)}
        >
          <CheckCircle2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Cancelar compra"
          data-cy="purchase-cancel"
          disabled={!canMutate}
          onClick={() => onCancel(purchase)}
        >
          <XCircle className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SupplierSpend({ name, value, percent }: { name: string; value: number; percent: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold text-white">{name}</span>
        <span className="nums text-sm font-bold text-white">{formatMoney(value, 'COP')}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-orange" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function PurchasesWorkspace() {
  const appToast = useAppToast();
  const purchases = usePurchases();
  const suppliers = useSuppliers({ isActive: true, pageSize: 50 });
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PurchaseAction>();

  const purchaseList = purchases.listQuery.data?.data ?? EMPTY_PURCHASES;
  const supplierList = suppliers.listQuery.data?.data ?? EMPTY_SUPPLIERS;
  const total = purchaseList
    .filter((purchase) => purchase.status !== 'CANCELLED')
    .reduce((sum, purchase) => sum + purchase.total, 0);
  const pending = purchaseList
    .filter((purchase) => purchase.status === 'DRAFT')
    .reduce((sum, purchase) => sum + purchase.total, 0);
  const received = purchaseList.filter((purchase) => purchase.status === 'RECEIVED').length;
  const supplierCount = suppliers.listQuery.data?.meta.total ?? supplierList.length;

  const periodsData = purchases.periodsQuery.data;
  const selectedPeriod = purchases.params.period ?? periodsData?.currentPeriod;
  const isCurrentPeriod = !selectedPeriod || selectedPeriod === periodsData?.currentPeriod;
  const periodSummary = periodsData?.periods.find((entry) => entry.period === selectedPeriod);
  const monthLabel = formatPeriodLabel(selectedPeriod);
  const monthTotal = periodSummary?.total ?? total;

  const supplierSpend = useMemo(() => {
    const spend = new Map<string, number>();
    for (const purchase of purchaseList) {
      if (purchase.status === 'CANCELLED') {
        continue;
      }
      spend.set(purchase.supplierName, (spend.get(purchase.supplierName) ?? 0) + purchase.total);
    }
    const rows = Array.from(spend.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const max = Math.max(...rows.map((row) => row.value), 1);
    return rows.map((row) => ({ ...row, percent: Math.max(8, Math.round((row.value / max) * 100)) }));
  }, [purchaseList]);

  const isSavingPurchase = purchases.createMutation.isPending;
  const isSavingSupplier = suppliers.createMutation.isPending;
  const isRunningAction = purchases.receiveMutation.isPending || purchases.cancelMutation.isPending;

  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    purchases.setParams((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const onSubmitPurchase = async (values: PurchaseFormValues) => {
    try {
      await purchases.createMutation.mutateAsync(toPurchasePayload(values));
      appToast.success('Compra registrada', 'El documento quedo pendiente de recepcion.');
    } catch (error) {
      appToast.error(
        'No se pudo registrar la compra',
        getErrorMessage(error, 'Revisa proveedor, cantidades y costos.'),
      );
      throw error;
    }
  };

  const onSubmitSupplier = async (values: SupplierFormValues) => {
    try {
      await suppliers.createMutation.mutateAsync(toSupplierPayload(values));
      appToast.success('Proveedor creado', `${values.name.trim()} ya esta disponible para compras.`);
    } catch (error) {
      appToast.error(
        'No se pudo crear el proveedor',
        getErrorMessage(error, 'Revisa nombre, documento o correo.'),
      );
      throw error;
    }
  };

  const onConfirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    try {
      if (pendingAction.type === 'receive') {
        await purchases.receiveMutation.mutateAsync(pendingAction.purchase.id);
        appToast.success('Compra recibida', `${pendingAction.purchase.supplierName} actualizada.`);
      } else {
        await purchases.cancelMutation.mutateAsync(pendingAction.purchase.id);
        appToast.warning('Compra cancelada', `${pendingAction.purchase.reference ?? 'Documento'} no seguira activa.`);
      }
      setPendingAction(undefined);
    } catch (error) {
      appToast.error(
        'No se pudo actualizar la compra',
        getErrorMessage(error, 'La compra puede haber cambiado de estado.'),
      );
    }
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]" data-cy="purchases-page">
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Compras del mes" value={formatMoney(monthTotal, 'COP')} hint={monthLabel} />
            <KpiCard label="Por recibir" value={formatMoney(pending, 'COP')} hint="Compras en borrador" accent="warning" />
            <KpiCard label="Recibidas" value={received} hint="Confirmadas en operación" accent="success" />
            <KpiCard label="Proveedores" value={supplierCount} hint="Activos para compras" />
          </div>

          <Card className="gap-4 rounded-2xl border-border/80 bg-card py-5 shadow-sm">
            <CardHeader className="px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Compras y proveedores</CardTitle>
                  <CardDescription>Documentos reales de compra conectados al backend</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    data-cy="purchases-new-supplier"
                    onClick={() => setIsSupplierFormOpen(true)}
                  >
                    <Store className="size-4" />
                    Nuevo proveedor
                  </Button>
                  <Button
                    type="button"
                    data-cy="purchases-new-purchase"
                    onClick={() => setIsPurchaseFormOpen(true)}
                  >
                    <Plus className="size-4" />
                    Nueva compra
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    data-cy="purchases-search"
                    value={purchases.params.search ?? ''}
                    onChange={onSearch}
                    placeholder="Buscar proveedor, documento o notas"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={selectedPeriod ?? ''}
                  onValueChange={(value) => purchases.setPeriod(value)}
                  disabled={purchases.periodsQuery.isLoading}
                >
                  <SelectTrigger className="w-[210px]" data-cy="purchases-period">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {(periodsData?.periods ?? []).map((entry) => (
                      <SelectItem key={entry.period} value={entry.period}>
                        {formatPeriodLabel(entry.period)}
                        {entry.period === periodsData?.currentPeriod ? ' · actual' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isCurrentPeriod ? (
                <div
                  className="flex items-center justify-between rounded-xl border border-orange/25 bg-orange/[0.05] px-4 py-2.5 text-[12.5px] text-[#8A5326]"
                  data-cy="purchases-history-banner"
                >
                  <span>
                    Viendo el histórico de <strong>{monthLabel}</strong> (solo lectura).
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-orange transition-colors hover:text-[#B5491F]"
                    onClick={() => periodsData && purchases.setPeriod(periodsData.currentPeriod)}
                  >
                    Volver al mes actual
                  </button>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
                {purchases.listQuery.isLoading
                  ? SKELETON_ROWS.map((row) => (
                      <div key={row} className="border-b border-[#F2ECE3] px-[18px] py-4">
                        <Skeleton className="h-7 w-full" />
                      </div>
                    ))
                  : null}

                {!purchases.listQuery.isLoading && purchaseList.length === 0 ? (
                  <div className="px-[18px] py-12 text-center text-sm text-muted-foreground">
                    No hay compras registradas. Crea un proveedor y luego registra una compra.
                  </div>
                ) : null}

                {!purchases.listQuery.isLoading
                  ? purchaseList.map((purchase) => (
                      <PurchaseRowItem
                        key={purchase.id}
                        purchase={purchase}
                        onReceive={(item) => setPendingAction({ type: 'receive', purchase: item })}
                        onCancel={(item) => setPendingAction({ type: 'cancel', purchase: item })}
                      />
                    ))
                  : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="gap-4 rounded-2xl border-transparent bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Control de costos</CardTitle>
                  <CardDescription className="text-white/55">Proveedores con mayor gasto</CardDescription>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-white/8 text-orange">
                  <ReceiptText className="size-5" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              {supplierSpend.length > 0 ? (
                supplierSpend.map((supplier) => (
                  <SupplierSpend key={supplier.name} {...supplier} />
                ))
              ) : (
                <p className="text-sm text-white/55">Sin compras activas todavia.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <PurchaseFormDialog
        open={isPurchaseFormOpen}
        suppliers={supplierList}
        isSubmitting={isSavingPurchase}
        onOpenChange={setIsPurchaseFormOpen}
        onSubmit={onSubmitPurchase}
      />

      <SupplierFormDialog
        open={isSupplierFormOpen}
        isSubmitting={isSavingSupplier}
        onOpenChange={setIsSupplierFormOpen}
        onSubmit={onSubmitSupplier}
      />

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'receive' ? 'Recibir compra' : 'Cancelar compra'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'receive'
                ? 'Confirma que el documento y los productos fueron recibidos correctamente.'
                : 'Esta compra quedara cancelada y no sumara al control operativo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRunningAction}>Volver</AlertDialogCancel>
            <AlertDialogAction
              data-cy="purchase-confirm-action"
              disabled={isRunningAction}
              onClick={onConfirmAction}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
