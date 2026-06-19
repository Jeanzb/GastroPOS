import { useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  LockKeyhole,
  Plus,
  ReceiptText,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashSession } from '@/hooks/cash';
import { formatMoney } from '@/lib';
import { cn } from '@/lib/utils';
import type {
  CashMovementFormValues,
  CloseCashSessionFormValues,
  OpenCashSessionFormValues,
} from '@/schemas/cash';
import type { CashMovementDto, CashMovementType } from '@/types/cash';
import { CashMovementDialog } from './CashMovementDialog';
import { CloseCashSessionDialog } from './CloseCashSessionDialog';
import { CashZReportDialog } from './CashZReportDialog';
import { OpenCashSessionDialog } from './OpenCashSessionDialog';

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  OPENING_BALANCE: 'Base inicial',
  CASH_IN: 'Entrada de efectivo',
  CASH_OUT: 'Salida de efectivo',
  SALE_PAYMENT: 'Pago en efectivo',
  REFUND: 'Devolucion',
  TIP: 'Propina',
  ADJUSTMENT: 'Ajuste',
};

const MOVEMENT_SIGN: Record<CashMovementType, 1 | -1> = {
  OPENING_BALANCE: 1,
  CASH_IN: 1,
  SALE_PAYMENT: 1,
  TIP: 1,
  ADJUSTMENT: 1,
  CASH_OUT: -1,
  REFUND: -1,
};

const EMPTY_MOVEMENTS: CashMovementDto[] = [];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function optionalString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function calculateExpectedAmount(movements: CashMovementDto[]): number {
  return movements.reduce(
    (total, movement) => total + MOVEMENT_SIGN[movement.type] * movement.amount,
    0,
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function MovementIcon({ type }: { type: CashMovementType }) {
  if (type === 'SALE_PAYMENT' || type === 'OPENING_BALANCE') {
    return <ReceiptText className="h-4 w-4" />;
  }
  if (MOVEMENT_SIGN[type] < 0) {
    return <ArrowDownLeft className="h-4 w-4" />;
  }
  return <ArrowUpRight className="h-4 w-4" />;
}

function MovementRow({ movement, currency }: { movement: CashMovementDto; currency: string }) {
  const signedAmount = MOVEMENT_SIGN[movement.type] * movement.amount;
  const detail = movement.reference ?? movement.notes ?? formatDateTime(movement.createdAt);
  const isNegative = signedAmount < 0;

  return (
    <div className="motion-press flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 hover:border-orange/30 hover:bg-orange/5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'grid h-9 w-9 place-items-center rounded-lg border',
            isNegative
              ? 'border-destructive/20 bg-danger-soft text-destructive'
              : 'border-success/20 bg-success-soft text-success',
          )}
        >
          <MovementIcon type={movement.type} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{MOVEMENT_LABELS[movement.type]}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <p
        className={cn(
          'nums shrink-0 text-sm font-semibold',
          isNegative ? 'text-destructive' : 'text-success',
        )}
      >
        {formatMoney(signedAmount, currency)}
      </p>
    </div>
  );
}

function renderSkeletonRow(row: number) {
  return <Skeleton key={row} className="h-14 w-full" />;
}

export function CashWorkspace() {
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [zReportSessionId, setZReportSessionId] = useState<string | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const cash = useCashSession(zReportSessionId);

  const session = cash.activeSessionQuery.data ?? null;
  const movements = cash.movementsQuery.data ?? EMPTY_MOVEMENTS;
  const currency = session?.currency ?? 'COP';
  const expectedAmount = session ? calculateExpectedAmount(movements) : 0;
  const isLoading =
    cash.activeSessionQuery.isLoading || (Boolean(session) && cash.movementsQuery.isLoading);

  const onOpenSession = async (values: OpenCashSessionFormValues) => {
    try {
      await cash.openMutation.mutateAsync({
        openingBalance: values.openingBalance,
        notes: optionalString(values.notes),
      });
      toast.success('Caja abierta', {
        description: `Base inicial ${formatMoney(values.openingBalance, currency)} lista para el turno.`,
      });
    } catch (error) {
      toast.error('No se pudo abrir la caja', {
        description: getErrorMessage(error, 'Revisa la conexion o el estado del turno.'),
      });
      throw error;
    }
  };

  const onRegisterMovement = async (values: CashMovementFormValues) => {
    if (!session) {
      return;
    }

    try {
      await cash.movementMutation.mutateAsync({
        sessionId: session.id,
        payload: {
          type: values.type,
          amount: values.amount,
          reference: optionalString(values.reference),
          notes: optionalString(values.notes),
        },
      });
      toast.success('Movimiento registrado', {
        description: `${MOVEMENT_LABELS[values.type]} por ${formatMoney(values.amount, currency)} quedo auditado.`,
      });
    } catch (error) {
      toast.error('No se pudo registrar el movimiento', {
        description: getErrorMessage(error, 'Valida el monto y vuelve a intentarlo.'),
      });
      throw error;
    }
  };

  const onCloseSession = async (values: CloseCashSessionFormValues) => {
    if (!session) {
      return;
    }

    try {
      const closedSession = await cash.closeMutation.mutateAsync({
        sessionId: session.id,
        payload: {
          countedAmount: values.countedAmount,
          notes: optionalString(values.notes),
        },
      });
      setZReportSessionId(closedSession.id);
      setIsZReportOpen(true);
      toast.success('Caja cerrada', {
        description: `Diferencia registrada: ${formatMoney(values.countedAmount - expectedAmount, currency)}.`,
      });
    } catch (error) {
      toast.error('No se pudo cerrar la caja', {
        description: getErrorMessage(error, 'Confirma el conteo y las notas del cierre.'),
      });
      throw error;
    }
  };

  const renderMovement = (movement: CashMovementDto) => (
    <MovementRow key={movement.id} movement={movement} currency={currency} />
  );

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]" data-cy="cash-page">
        <section className="space-y-4">
          <Card className="gap-5 overflow-hidden border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Sesion de caja</CardTitle>
                  <CardDescription>
                    Responsable, base inicial y diferencias del turno
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={session ? 'green' : 'neutral'}>
                    {session ? 'Abierta' : 'Cerrada'}
                  </StatusPill>
                  {!session ? (
                    <Button type="button" onClick={() => setIsOpenDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Abrir caja
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-success/20 bg-success-soft p-4 text-success">
                    <p className="text-sm text-muted-foreground">Efectivo esperado</p>
                    <p className="nums mt-2 font-display text-3xl font-semibold">
                      {formatMoney(expectedAmount, currency)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Base inicial</p>
                    <p className="nums mt-2 font-display text-3xl font-semibold">
                      {formatMoney(session?.openingBalance ?? 0, currency)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange/20 bg-orange/10 p-4">
                    <p className="text-sm text-muted-foreground">Apertura</p>
                    <p className="mt-2 font-display text-xl font-semibold">
                      {session ? formatDateTime(session.openedAt) : 'Sin turno'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <CardTitle>Movimientos recientes</CardTitle>
              <CardDescription>Cada movimiento queda auditado por usuario y sede</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              {isLoading ? [0, 1, 2].map(renderSkeletonRow) : null}
              {!isLoading && !session ? (
                <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                  Abre una caja para registrar movimientos del turno.
                </div>
              ) : null}
              {!isLoading && session && movements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                  Aun no hay movimientos en esta caja.
                </div>
              ) : null}
              {!isLoading && session && movements.length > 0 ? movements.map(renderMovement) : null}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="gap-4 border-border/80 bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
            <CardHeader className="px-5">
              <CardTitle>Cierre de turno</CardTitle>
              <CardDescription className="text-white/55">
                Compara esperado contra contado antes de cerrar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              <div className="rounded-lg border border-warning/25 bg-warning-soft p-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <p className="text-sm">
                    El cierre debe confirmar responsable, diferencia y notas.
                  </p>
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-white/55">Esperado actual</p>
                <p className="nums mt-1 text-2xl font-semibold">
                  {formatMoney(expectedAmount, currency)}
                </p>
              </div>
              <Button
                className="w-full"
                disabled={!session || cash.closeMutation.isPending}
                onClick={() => setIsCloseDialogOpen(true)}
                data-cy="cash-close-open"
              >
                {cash.closeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                Cerrar caja
              </Button>
              <Button
                variant="outline"
                className="w-full bg-background"
                disabled={!session || cash.movementMutation.isPending}
                onClick={() => setIsMovementDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Movimiento manual
              </Button>
              <Button
                variant="outline"
                className="w-full bg-background"
                disabled={!zReportSessionId}
                onClick={() => setIsZReportOpen(true)}
                data-cy="cash-z-report-open"
              >
                <FileText className="h-4 w-4" />
                Ver Reporte Z
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <OpenCashSessionDialog
        open={isOpenDialogOpen}
        isSubmitting={cash.openMutation.isPending}
        onOpenChange={setIsOpenDialogOpen}
        onSubmit={onOpenSession}
      />
      <CashMovementDialog
        open={isMovementDialogOpen}
        isSubmitting={cash.movementMutation.isPending}
        onOpenChange={setIsMovementDialogOpen}
        onSubmit={onRegisterMovement}
      />
      <CloseCashSessionDialog
        open={isCloseDialogOpen}
        expectedAmount={expectedAmount}
        currency={currency}
        isSubmitting={cash.closeMutation.isPending}
        onOpenChange={setIsCloseDialogOpen}
        onSubmit={onCloseSession}
      />
      <CashZReportDialog
        open={isZReportOpen}
        report={cash.zReportQuery.data}
        isLoading={cash.zReportQuery.isLoading || cash.zReportQuery.isFetching}
        isError={cash.zReportQuery.isError}
        onOpenChange={setIsZReportOpen}
        onRetry={() => void cash.zReportQuery.refetch()}
      />
    </>
  );
}
