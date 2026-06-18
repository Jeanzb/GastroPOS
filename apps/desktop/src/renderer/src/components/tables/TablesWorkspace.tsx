import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChefHat,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  Users,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { StatusPill } from '@/components/operations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useDiningRoom, useSellableProducts, useTableAccount } from '@/hooks/operations';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  chargeTableAccountSchema,
  openTableAccountSchema,
  type ChargeTableAccountValues,
  type OpenTableAccountValues,
} from '@/schemas/dining';
import { useAuthStore } from '@/stores';
import type { ProductDto } from '@/types/catalog';
import type {
  DiningTableDto,
  DiningTableStatus,
  DiningZoneDto,
  KitchenCommandDto,
  ReceiptDto,
  TableAccountDto,
  TablePaymentMethod,
} from '@/types/dining';

type StatusTone = 'green' | 'red' | 'amber' | 'neutral';

const STATUS_CONFIG: Record<
  DiningTableStatus,
  { label: string; tone: StatusTone; topBorder: string; dot: string }
> = {
  FREE: { label: 'Libre', tone: 'green', topBorder: 'bg-emerald-400', dot: 'bg-emerald-500' },
  OCCUPIED: { label: 'Ocupada', tone: 'red', topBorder: 'bg-red-400', dot: 'bg-red-500' },
  PENDING_BILL: { label: 'Cuenta pendiente', tone: 'amber', topBorder: 'bg-amber-400', dot: 'bg-amber-500' },
  RESERVED: { label: 'Reservada', tone: 'neutral', topBorder: 'bg-muted-foreground/40', dot: 'bg-muted-foreground/60' },
};

const PAYMENT_LABELS: Record<TablePaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

const ALL = 'all';

function countByStatus(tables: DiningTableDto[], status: DiningTableStatus): number {
  return tables.filter((table) => table.status === status).length;
}

function activeCount(tables: DiningTableDto[]): number {
  return tables.filter(
    (table) => table.status === 'OCCUPIED' || table.status === 'PENDING_BILL',
  ).length;
}

function getMinutes(table: DiningTableDto): number | null {
  if (!table.openedAt) {
    return null;
  }
  return Math.max(0, Math.round((Date.now() - new Date(table.openedAt).getTime()) / 60_000));
}

function tableDetail(table: DiningTableDto): string | null {
  if (table.status === 'OCCUPIED' || table.status === 'PENDING_BILL') {
    const minutes = getMinutes(table);
    return `${minutes ?? 0} min - ${table.waiterName ?? 'Sin mesero'}`;
  }
  if (table.status === 'RESERVED') {
    return `${table.reservationTime ?? 'Sin hora'} - ${table.reservationName ?? 'Reserva'}`;
  }
  return null;
}

function LegendItem({ tone, label }: { tone: StatusTone; label: string }) {
  const dot = STATUS_CONFIG[
    (Object.keys(STATUS_CONFIG) as DiningTableStatus[]).find(
      (status) => STATUS_CONFIG[status].tone === tone,
    ) ?? 'FREE'
  ].dot;
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  );
}

function ZoneTabs({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: { id: string; label: string; count: number }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const active = container.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (active) {
      setPill({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
    }
  }, [activeId, tabs.length]);

  return (
    <div
      ref={ref}
      className="relative flex items-center rounded-xl border border-border bg-surface-raised p-1"
    >
      {pill.ready ? (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-0 rounded-lg bg-carbon shadow-sm ease-[cubic-bezier(.34,1.38,.46,1)] [transition:transform_360ms,width_360ms] motion-reduce:transition-none"
          style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
        />
      ) : null}
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            data-active={isActive}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'relative z-10 flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span className={cn('nums text-xs', isActive ? 'text-white/65' : 'text-muted-foreground/70')}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TableCard({
  table,
  isSelected,
  onSelect,
}: {
  table: DiningTableDto;
  isSelected: boolean;
  onSelect: (table: DiningTableDto) => void;
}) {
  const status = STATUS_CONFIG[table.status];
  const detail = tableDetail(table);

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      className={cn(
        'group relative flex min-h-[132px] flex-col overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40',
        isSelected ? 'border-orange/60 ring-2 ring-orange/20' : 'border-border',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', status.topBorder)} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Mesa
          </p>
          <p className="nums mt-0.5 text-3xl font-bold leading-none text-foreground">
            {table.number}
          </p>
        </div>
        <span className="nums flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {table.seats}
        </span>
      </div>

      <div className="mt-3">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {detail ? (
        <p className="nums mt-auto pt-3 text-xs text-muted-foreground">{detail}</p>
      ) : (
        <span className="mt-auto" />
      )}
    </button>
  );
}

function OpenAccountForm({
  table,
  defaultWaiterName,
  isSubmitting,
  onSubmit,
}: {
  table: DiningTableDto;
  defaultWaiterName: string;
  isSubmitting: boolean;
  onSubmit: (values: OpenTableAccountValues) => Promise<void>;
}) {
  const form = useForm<OpenTableAccountValues>({
    resolver: zodResolver(openTableAccountSchema),
    defaultValues: {
      waiterName: defaultWaiterName,
      guestCount: table.seats,
      customerName: '',
    },
  });

  useEffect(() => {
    form.reset({
      waiterName: table.waiterName ?? defaultWaiterName,
      guestCount: table.seats,
      customerName: table.reservationName ?? '',
    });
  }, [defaultWaiterName, form, table]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="waiterName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mesero</FormLabel>
                <FormControl>
                  <Input placeholder="Maria Restrepo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="guestCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === '' ? undefined : Number(event.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente o referencia</FormLabel>
              <FormControl>
                <Input placeholder="Mesa familia Gomez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Abrir cuenta
        </Button>
      </form>
    </Form>
  );
}

function ProductsPicker({
  products,
  isLoading,
  isPending,
  onAdd,
}: {
  products: ProductDto[];
  isLoading: boolean;
  isPending: boolean;
  onAdd: (product: ProductDto) => Promise<void>;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No hay productos vendibles activos.
      </div>
    );
  }

  return (
    <div className="grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1 xl:grid-cols-2">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          disabled={isPending}
          onClick={() => void onAdd(product)}
          className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:border-orange/50 hover:bg-orange/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 disabled:opacity-60"
        >
          <span>
            <span className="block text-sm font-semibold">{product.name}</span>
            <span className="nums text-xs text-muted-foreground">
              {formatMoney(product.priceAmount, product.currency)}
            </span>
          </span>
          <Plus className="h-4 w-4 text-orange" />
        </button>
      ))}
    </div>
  );
}

function AccountItems({
  account,
  isPending,
  onQuantityChange,
  onRemove,
}: {
  account: TableAccountDto;
  isPending: boolean;
  onQuantityChange: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}) {
  if (account.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        La cuenta esta abierta. Agrega productos para enviar comanda o cobrar.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {account.items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border bg-background p-3"
        >
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="nums text-xs text-muted-foreground">
              {item.quantity} x {formatMoney(item.unitPriceAmount, account.currency)}
            </p>
            <p className="nums mt-1 text-sm font-bold">
              {formatMoney(item.lineTotal, account.currency)}
            </p>
          </div>
          <div className="flex items-center gap-1 self-start">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isPending}
              aria-label={`Restar ${item.name}`}
              onClick={() => void onQuantityChange(item.id, Math.max(0, item.quantity - 1))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="nums w-7 text-center text-sm font-semibold">{item.quantity}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isPending}
              aria-label={`Sumar ${item.name}`}
              onClick={() => void onQuantityChange(item.id, item.quantity + 1)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending}
              aria-label={`Eliminar ${item.name}`}
              onClick={() => void onRemove(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountPanel({
  table,
  account,
  isLoading,
  products,
  productsLoading,
  isMutating,
  defaultWaiterName,
  onOpenAccount,
  onAddProduct,
  onQuantityChange,
  onRemoveItem,
  onCommand,
  onReceipt,
  onCharge,
}: {
  table: DiningTableDto | null;
  account?: TableAccountDto | null;
  isLoading: boolean;
  products: ProductDto[];
  productsLoading: boolean;
  isMutating: boolean;
  defaultWaiterName: string;
  onOpenAccount: (values: OpenTableAccountValues) => Promise<void>;
  onAddProduct: (product: ProductDto) => Promise<void>;
  onQuantityChange: (itemId: string, quantity: number) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onCommand: () => Promise<void>;
  onReceipt: () => Promise<void>;
  onCharge: () => void;
}) {
  if (!table) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Selecciona una mesa para operar su cuenta.
        </CardContent>
      </Card>
    );
  }

  const status = STATUS_CONFIG[table.status];

  if (isLoading) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Mesa seleccionada
            </p>
            <CardTitle className="nums mt-1 text-3xl">Mesa {table.number}</CardTitle>
          </div>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{table.seats} puestos</Badge>
          {account?.waiterName ? <Badge variant="outline">{account.waiterName}</Badge> : null}
          {account?.guestCount ? <Badge variant="outline">{account.guestCount} personas</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!account ? (
          <OpenAccountForm
            table={table}
            defaultWaiterName={defaultWaiterName}
            isSubmitting={isMutating}
            onSubmit={onOpenAccount}
          />
        ) : (
          <>
            <div className="rounded-xl border border-border bg-carbon p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">Total cuenta</span>
                <span className="nums text-2xl font-bold">
                  {formatMoney(account.grandTotal, account.currency)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-white/65">
                <span>Items: {account.items.length}</span>
                <span>Pagado: {formatMoney(account.paidTotal, account.currency)}</span>
                <span>Saldo: {formatMoney(account.balanceDue, account.currency)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Productos</h3>
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              </div>
              <ProductsPicker
                products={products}
                isLoading={productsLoading}
                isPending={isMutating}
                onAdd={onAddProduct}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Cuenta</h3>
              <AccountItems
                account={account}
                isPending={isMutating}
                onQuantityChange={onQuantityChange}
                onRemove={onRemoveItem}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isMutating || account.items.length === 0}
                onClick={() => void onCommand()}
              >
                <ChefHat className="h-4 w-4" />
                Comanda
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isMutating || account.items.length === 0}
                onClick={() => void onReceipt()}
              >
                <ReceiptText className="h-4 w-4" />
                Recibo
              </Button>
              <Button
                type="button"
                disabled={isMutating || account.items.length === 0}
                onClick={onCharge}
              >
                <CreditCard className="h-4 w-4" />
                Cobrar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CommandDialog({
  command,
  open,
  onOpenChange,
}: {
  command: KitchenCommandDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comanda mesa {command?.tableNumber}</DialogTitle>
        </DialogHeader>
        {command ? (
          <div className="space-y-4 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span>{command.waiterName ?? 'Sin mesero'}</span>
              <span className="nums">{new Date(command.createdAt).toLocaleTimeString('es-CO')}</span>
            </div>
            <div className="space-y-2">
              {command.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm">
                  <span>{item.name}</span>
                  <span className="nums font-bold">x{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 text-sm font-semibold">
              Total unidades: {command.totalItems}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
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

function ReceiptDialog({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ReceiptDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recibo mesa {receipt?.tableNumber}</DialogTitle>
        </DialogHeader>
        {receipt ? (
          <div className="space-y-4 rounded-lg border border-border bg-background p-4">
            <div className="space-y-2">
              {receipt.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                  <span>
                    {item.name}
                    <span className="nums block text-xs text-muted-foreground">
                      {item.quantity} x {formatMoney(item.unitPriceAmount, receipt.currency)}
                    </span>
                  </span>
                  <span className="nums font-semibold">
                    {formatMoney(item.lineTotal, receipt.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="nums">{formatMoney(receipt.subtotal, receipt.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span className="nums">{formatMoney(receipt.taxTotal, receipt.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="nums">{formatMoney(receipt.total, receipt.currency)}</span>
              </div>
              {receipt.paymentMethod ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Pago</span>
                  <span>{PAYMENT_LABELS[receipt.paymentMethod]}</span>
                </div>
              ) : null}
              {receipt.invoice ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Factura electronica en borrador: {receipt.invoice.status}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
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

function ChargeDialog({
  account,
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  account: TableAccountDto | null | undefined;
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChargeTableAccountValues) => Promise<void>;
}) {
  const form = useForm<ChargeTableAccountValues>({
    resolver: zodResolver(chargeTableAccountSchema),
    defaultValues: {
      method: 'CARD',
      amount: account?.balanceDue ?? 0,
      reference: '',
      requiresInvoice: false,
      customer: undefined,
    },
  });
  const requiresInvoice = form.watch('requiresInvoice');

  useEffect(() => {
    if (open) {
      form.reset({
        method: 'CARD',
        amount: account?.balanceDue ?? 0,
        reference: '',
        requiresInvoice: false,
        customer: undefined,
      });
    }
  }, [account?.balanceDue, form, open]);

  useEffect(() => {
    if (requiresInvoice && !form.getValues('customer')) {
      form.setValue('customer', {
        documentType: 'CC',
        documentNumber: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        municipality: '',
        taxResponsibility: '',
      });
    }
    if (!requiresInvoice) {
      form.setValue('customer', undefined);
    }
  }, [form, requiresInvoice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cobrar mesa {account?.tableNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medio de pago</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl>
                      <Input placeholder="Voucher o transferencia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requiresInvoice"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <FormLabel>Requiere factura electronica</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Se crea un borrador fiscal; el envio DIAN queda pendiente.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requiresInvoice ? (
              <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer.documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo documento</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['CC', 'NIT', 'CE', 'PP', 'TI', 'NUIP', 'OTHER'].map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero</FormLabel>
                      <FormControl>
                        <Input placeholder="900123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="Cliente facturacion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="cliente@correo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="3001234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.municipality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipio</FormLabel>
                      <FormControl>
                        <Input placeholder="Medellin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Cobrar cuenta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function TablesWorkspace() {
  const [activeZone, setActiveZone] = useState<string>(ALL);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [command, setCommand] = useState<KitchenCommandDto | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const diningRoom = useDiningRoom();
  const productsQuery = useSellableProducts();
  const zones = diningRoom.zonesQuery.data ?? [];
  const allTables = useMemo(() => zones.flatMap((zone) => zone.tables), [zones]);
  const selectedTable =
    allTables.find((table) => table.id === selectedTableId) ?? allTables[0] ?? null;
  const account = useTableAccount(selectedTable?.id);
  const isMutating =
    account.openAccountMutation.isPending ||
    account.addItemMutation.isPending ||
    account.updateItemMutation.isPending ||
    account.removeItemMutation.isPending ||
    account.commandMutation.isPending ||
    account.receiptMutation.isPending ||
    account.chargeMutation.isPending;

  useEffect(() => {
    if (!selectedTableId && allTables.length > 0) {
      setSelectedTableId(allTables[0].id);
    }
  }, [allTables, selectedTableId]);

  const visibleZones = activeZone === ALL ? zones : zones.filter((zone) => zone.id === activeZone);

  const handleOpenAccount = async (values: OpenTableAccountValues) => {
    try {
      await account.openAccountMutation.mutateAsync(values);
      toast.success('Cuenta abierta', {
        description: selectedTable ? `Mesa ${selectedTable.number} lista para tomar pedido.` : undefined,
      });
    } catch (error) {
      toast.error('No se pudo abrir la cuenta', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const handleAddProduct = async (product: ProductDto) => {
    const currentAccount = account.accountQuery.data;
    if (!currentAccount) {
      return;
    }

    try {
      await account.addItemMutation.mutateAsync({
        saleId: currentAccount.id,
        payload: { productId: product.id, quantity: 1 },
      });
      toast.success('Producto agregado', {
        description: product.name,
      });
    } catch (error) {
      toast.error('No se pudo agregar el producto', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    const currentAccount = account.accountQuery.data;
    if (!currentAccount) {
      return;
    }

    try {
      await account.updateItemMutation.mutateAsync({
        saleId: currentAccount.id,
        itemId,
        payload: { quantity },
      });
    } catch (error) {
      toast.error('No se pudo actualizar el item', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const currentAccount = account.accountQuery.data;
    if (!currentAccount) {
      return;
    }

    try {
      await account.removeItemMutation.mutateAsync({
        saleId: currentAccount.id,
        itemId,
      });
    } catch (error) {
      toast.error('No se pudo eliminar el item', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const handleCommand = async () => {
    const currentAccount = account.accountQuery.data;
    if (!currentAccount) {
      return;
    }
    try {
      const result = await account.commandMutation.mutateAsync(currentAccount.id);
      setCommand(result);
      toast.success('Comanda lista', {
        description: `Mesa ${result.tableNumber} - ${result.totalItems} unidades`,
      });
    } catch (error) {
      toast.error('No se pudo generar la comanda', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const handleReceipt = async () => {
    const currentAccount = account.accountQuery.data;
    if (!currentAccount) {
      return;
    }
    try {
      const result = await account.receiptMutation.mutateAsync(currentAccount.id);
      setReceipt(result);
    } catch (error) {
      toast.error('No se pudo generar el recibo', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const handleCharge = async (values: ChargeTableAccountValues) => {
    const currentAccount = account.accountQuery.data;
    if (!currentAccount) {
      return;
    }
    try {
      const result = await account.chargeMutation.mutateAsync({
        saleId: currentAccount.id,
        payload: {
          method: values.method,
          amount: values.amount,
          reference: values.reference,
          requiresInvoice: values.requiresInvoice,
          customer: values.requiresInvoice ? values.customer : undefined,
        },
      });
      setReceipt(result);
      setChargeOpen(false);
      toast.success('Cuenta cobrada', {
        description: values.requiresInvoice
          ? 'Se creo un borrador de factura electronica.'
          : 'La mesa quedo liberada.',
      });
    } catch (error) {
      toast.error('No se pudo cobrar la cuenta', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  const renderTable = (table: DiningTableDto) => (
    <TableCard
      key={table.id}
      table={table}
      isSelected={selectedTable?.id === table.id}
      onSelect={(nextTable) => setSelectedTableId(nextTable.id)}
    />
  );

  const renderZone = (zone: DiningZoneDto) => (
    <section key={zone.id} className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight">{zone.name}</h2>
        <StatusPill tone="neutral">{`${zone.tables.length} mesas - ${activeCount(zone.tables)} activas`}</StatusPill>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {zone.tables.map(renderTable)}
      </div>
    </section>
  );

  const zoneTabs = useMemo(
    () => [
      { id: ALL, label: 'Todas', count: allTables.length },
      ...zones.map((zone) => ({ id: zone.id, label: zone.name, count: zone.tables.length })),
    ],
    [allTables.length, zones],
  );

  if (diningRoom.zonesQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (diningRoom.zonesQuery.isError) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">No se pudieron cargar las mesas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifica que la API este corriendo y la sesion activa.
            </p>
          </div>
          <Button onClick={() => void diningRoom.zonesQuery.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  if (zones.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No hay zonas configuradas. Crea zonas y mesas desde el editor del salon.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ZoneTabs tabs={zoneTabs} activeId={activeZone} onSelect={setActiveZone} />
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <LegendItem tone="green" label="Libre" />
              <LegendItem tone="red" label="Ocupada" />
              <LegendItem tone="amber" label="Cuenta pendiente" />
              <LegendItem tone="neutral" label="Reservada" />
            </div>
          </div>

          <p className="nums text-sm text-muted-foreground">
            {countByStatus(allTables, 'FREE')} libres - {activeCount(allTables)} activas -{' '}
            {allTables.length} mesas en total
          </p>

          <div key={activeZone} className="dc-view-in space-y-6">
            {visibleZones.map(renderZone)}
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <AccountPanel
            table={selectedTable}
            account={account.accountQuery.data}
            isLoading={account.accountQuery.isLoading || account.accountQuery.isFetching}
            products={productsQuery.data ?? []}
            productsLoading={productsQuery.isLoading}
            isMutating={isMutating}
            defaultWaiterName={user?.fullName ?? 'Mesero'}
            onOpenAccount={handleOpenAccount}
            onAddProduct={handleAddProduct}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            onCommand={handleCommand}
            onReceipt={handleReceipt}
            onCharge={() => setChargeOpen(true)}
          />
        </div>
      </div>

      <CommandDialog command={command} open={Boolean(command)} onOpenChange={(open) => !open && setCommand(null)} />
      <ReceiptDialog receipt={receipt} open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)} />
      <ChargeDialog
        account={account.accountQuery.data}
        open={chargeOpen}
        isSubmitting={account.chargeMutation.isPending}
        onOpenChange={setChargeOpen}
        onSubmit={handleCharge}
      />
    </>
  );
}
