import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calculator,
  Loader2,
  Plus,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ChargeDialog, CommandDialog, ReceiptDialog } from '@/components/dining/AccountDialogs';
import { ComandaPanel } from './ComandaPanel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { QUERY_KEYS } from '@/constants';
import { useCategories } from '@/hooks/catalog';
import { useCashSession } from '@/hooks/cash';
import { useDiningRoom, useSellableProducts, useTableAccount } from '@/hooks/operations';
import { useAppToast } from '@/hooks/ui';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  openTableAccountSchema,
  type ChargeTableAccountValues,
  type OpenTableAccountValues,
} from '@/schemas/dining';
import { EmployeeService } from '@/services/employees';
import { useAuthStore, useOrderStore } from '@/stores';
import type { ProductDto } from '@/types/catalog';
import type { DiningTableDto, KitchenCommandDto, ReceiptDto } from '@/types/dining';

const ALL = 'all';

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'GA'
  );
}

function OpenAccountForm({
  table,
  defaultWaiterName,
  waiterOptions,
  autoAssignWaiter,
  isSubmitting,
  isLoadingWaiters,
  onSubmit,
}: {
  table: DiningTableDto;
  defaultWaiterName: string;
  waiterOptions: string[];
  autoAssignWaiter: boolean;
  isSubmitting: boolean;
  isLoadingWaiters: boolean;
  onSubmit: (values: OpenTableAccountValues) => Promise<void>;
}) {
  const form = useForm<OpenTableAccountValues>({
    resolver: zodResolver(openTableAccountSchema),
    defaultValues: { waiterName: defaultWaiterName, guestCount: table.seats, customerName: '' },
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
      <form
        onSubmit={form.handleSubmit(async (values) => {
          if (!autoAssignWaiter && !values.waiterName?.trim()) {
            form.setError('waiterName', { message: 'Selecciona un mesero activo' });
            return;
          }
          await onSubmit(values);
        })}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          {autoAssignWaiter ? (
            <FormField
              control={form.control}
              name="waiterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mesero</FormLabel>
                  <FormControl>
                    <Input value={field.value ?? ''} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="waiterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mesero</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isLoadingWaiters || waiterOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona mesero" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {waiterOptions.map((waiter) => (
                        <SelectItem key={waiter} value={waiter}>
                          {waiter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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
                      field.onChange(event.target.value === '' ? undefined : Number(event.target.value))
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
                <Input placeholder="Mesa familia Gómez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!autoAssignWaiter && !isLoadingWaiters && waiterOptions.length === 0 ? (
          <p className="rounded-lg border border-orange/20 bg-orange/8 px-3 py-2 text-xs text-[#9A4A22]">
            Crea o activa un mesero para esta sede antes de abrir la cuenta.
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isLoadingWaiters || (!autoAssignWaiter && waiterOptions.length === 0)}
          data-cy="pos-open-account"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Abrir cuenta
        </Button>
      </form>
    </Form>
  );
}

export function PosWorkspace() {
  const appToast = useAppToast();
  const navigate = useNavigate();
  const activeTableId = useOrderStore((state) => state.activeTableId);
  const setActiveTableId = useOrderStore((state) => state.setActiveTableId);
  const user = useAuthStore((state) => state.user);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [command, setCommand] = useState<KitchenCommandDto | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [cashRequiredOpen, setCashRequiredOpen] = useState(false);
  const [shouldReturnToTablesAfterReceipt, setShouldReturnToTablesAfterReceipt] = useState(false);

  const diningRoom = useDiningRoom();
  const cash = useCashSession();
  const productsQuery = useSellableProducts();
  const categoriesQuery = useCategories();
  const account = useTableAccount(activeTableId);
  const waitersQuery = useQuery({
    queryKey: [QUERY_KEYS.employees, { role: 'WAITER', isActive: true, branchId: user?.branchId }],
    queryFn: () =>
      EmployeeService.getEmployees({
        page: 1,
        pageSize: 100,
        role: 'WAITER',
        isActive: true,
        branchId: user?.branchId ?? undefined,
      }),
    enabled: Boolean(user?.branchId),
  });

  const zones = diningRoom.zonesQuery.data ?? [];
  const table = useMemo(
    () => zones.flatMap((zone) => zone.tables).find((item) => item.id === activeTableId) ?? null,
    [zones, activeTableId],
  );
  const currentAccount = account.accountQuery.data;
  const products = productsQuery.data ?? [];
  const categories = (categoriesQuery.listQuery.data?.data ?? []).filter((c) => c.isActive);
  const displayWaiterName = currentAccount?.waiterName ?? table?.waiterName ?? null;
  const waiterLabel = displayWaiterName ?? 'Sin mesero asignado';
  const currency = currentAccount?.currency ?? products[0]?.currency ?? 'COP';
  const waiterOptions = useMemo(() => {
    const names = (waitersQuery.data?.data ?? []).map((employee) => employee.fullName);
    return Array.from(new Set(names.filter((name) => Boolean(name.trim()))));
  }, [waitersQuery.data?.data]);
  const isPosWaiter = user?.authScope === 'POS' && user.role === 'WAITER';
  const defaultWaiterName = isPosWaiter
    ? user.fullName
    : table?.waiterName ?? '';

  const isMutating =
    account.openAccountMutation.isPending ||
    account.addItemMutation.isPending ||
    account.updateItemMutation.isPending ||
    account.removeItemMutation.isPending ||
    account.commandMutation.isPending ||
    account.receiptMutation.isPending ||
    account.chargeMutation.isPending ||
    cash.activeSessionQuery.isFetching;

  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === ALL || product.categoryId === activeCategory;
    const matchesSearch =
      !search.trim() ||
      product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      (product.sku ?? '').toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryTabs = [
    { id: ALL, name: 'Todos' },
    ...categories.map((category) => ({ id: category.id, name: category.name })),
  ];

  const handleOpenAccount = async (values: OpenTableAccountValues) => {
    try {
      await account.openAccountMutation.mutateAsync(values);
      appToast.success(
        'Cuenta abierta',
        table ? `Mesa ${table.number} lista para tomar pedido.` : undefined,
      );
    } catch (error) {
      appToast.error(
        'No se pudo abrir la cuenta',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const handleAddProduct = async (product: ProductDto) => {
    if (!currentAccount) {
      appToast.info('Abre la cuenta primero', 'Registra el mesero para tomar pedido.');
      return;
    }
    try {
      await account.addItemMutation.mutateAsync({
        saleId: currentAccount.id,
        payload: { productId: product.id, quantity: 1 },
      });
    } catch (error) {
      appToast.error(
        'No se pudo agregar el producto',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const handleQuantityChange = async (itemId: string, quantity: number) => {
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
      appToast.error(
        'No se pudo actualizar el item',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const handleCommand = async () => {
    if (!currentAccount) {
      return;
    }
    try {
      const result = await account.commandMutation.mutateAsync(currentAccount.id);
      setCommand(result);
      appToast.comandaEnviada(result.tableNumber, result.totalItems);
    } catch (error) {
      appToast.error(
        'No se pudo generar la comanda',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const handleCharge = async (values: ChargeTableAccountValues) => {
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
      setShouldReturnToTablesAfterReceipt(true);
      setChargeOpen(false);
      appToast.success(
        'Cuenta cobrada',
        values.requiresInvoice
          ? 'Se creó un borrador de factura electrónica.'
          : 'La mesa quedó liberada.',
      );
    } catch (error) {
      appToast.error(
        'No se pudo cobrar la cuenta',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const handleOpenChargeDialog = async () => {
    if (!currentAccount) {
      return;
    }

    try {
      const activeSession =
        cash.activeSessionQuery.data ?? (await cash.activeSessionQuery.refetch()).data;

      if (!activeSession) {
        setCashRequiredOpen(true);
        return;
      }

      setChargeOpen(true);
    } catch (error) {
      appToast.error(
        'No se pudo verificar la caja',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const handleReceiptOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    setReceipt(null);

    if (!shouldReturnToTablesAfterReceipt) {
      return;
    }

    setShouldReturnToTablesAfterReceipt(false);
    setActiveTableId(null);
    void navigate({ to: '/tables', replace: true });
  };

  if (!activeTableId || !table) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-orange/10 text-orange">
          <UtensilsCrossed className="size-6" />
        </span>
        <div>
          <p className="font-display text-lg font-bold tracking-tight">Selecciona una mesa</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abre una mesa desde el salón para tomar el pedido.
          </p>
        </div>
        <Button asChild>
          <Link to="/tables">Ir a Mesas</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex h-full max-w-[1320px] gap-[18px]" data-cy="pos-page">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex items-center gap-2.5">
            <Link
              to="/tables"
              className="motion-press flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 hover:-translate-y-0.5 hover:border-orange/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
              title="Volver a mesas"
            >
              <span className="nums text-[11px] text-muted-foreground">MESA</span>
              <span className="font-display text-[17px] font-bold">{table.number}</span>
            </Link>
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-orange/15 text-[11px] font-bold text-[#B5491F]">
                {displayWaiterName ? initials(displayWaiterName) : '--'}
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold">
                {waiterLabel}
              </span>
            </div>
            <div className="relative ml-auto w-[280px] shrink-0">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto o código…"
                className="pl-9"
                data-cy="pos-product-search"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categoryTabs.map((category) => {
              const isActive = category.id === activeCategory;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors',
                    isActive
                      ? 'border-carbon bg-carbon text-white'
                      : 'border-border bg-card text-foreground hover:border-carbon',
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="h-[104px] rounded-2xl" />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No hay productos en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isMutating}
                    onClick={() => void handleAddProduct(product)}
                    data-cy="pos-product-card"
                    className="flex min-h-[104px] flex-col gap-3.5 rounded-2xl border border-border bg-card p-[15px] text-left transition hover:-translate-y-0.5 hover:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 disabled:opacity-60"
                  >
                    <span className="flex-1 text-[14.5px] font-semibold leading-tight">{product.name}</span>
                    <span className="flex items-center justify-between">
                      <span className="nums text-sm font-bold">
                        {formatMoney(product.priceAmount, product.currency)}
                      </span>
                      <span className="flex size-[26px] items-center justify-center rounded-lg bg-orange/10 text-lg font-bold leading-none text-orange">
                        +
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="flex w-[380px] shrink-0 flex-col">
          <ComandaPanel
            account={currentAccount ?? null}
            tableNumber={table.number}
            waiterLabel={waiterLabel}
            isMutating={isMutating}
            isLoadingAccount={account.accountQuery.isLoading}
            onQuantityChange={(itemId, quantity) => void handleQuantityChange(itemId, quantity)}
            onCommand={() => void handleCommand()}
            onCharge={() => void handleOpenChargeDialog()}
            emptyState={
              <OpenAccountForm
                table={table}
                defaultWaiterName={defaultWaiterName}
                waiterOptions={waiterOptions}
                autoAssignWaiter={isPosWaiter}
                isSubmitting={isMutating}
                isLoadingWaiters={waitersQuery.isLoading}
                onSubmit={handleOpenAccount}
              />
            }
          />
        </aside>
      </div>

      <CommandDialog command={command} open={Boolean(command)} onOpenChange={(open) => !open && setCommand(null)} />
      <ReceiptDialog
        receipt={receipt}
        open={Boolean(receipt)}
        onOpenChange={handleReceiptOpenChange}
      />
      <Dialog open={cashRequiredOpen} onOpenChange={setCashRequiredOpen}>
        <DialogContent className="sm:max-w-md" data-cy="pos-cash-required-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange" />
              Caja cerrada
            </DialogTitle>
            <DialogDescription>
              Debe abrir el turno de caja (base inicial) para poder registrar ventas
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCashRequiredOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCashRequiredOpen(false);
                void navigate({ to: '/cash' });
              }}
              data-cy="pos-open-cash-from-blocker"
            >
              <Calculator className="h-4 w-4" />
              Abrir caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ChargeDialog
        account={currentAccount}
        open={chargeOpen}
        isSubmitting={account.chargeMutation.isPending}
        onOpenChange={setChargeOpen}
        onSubmit={handleCharge}
      />
    </>
  );
}
