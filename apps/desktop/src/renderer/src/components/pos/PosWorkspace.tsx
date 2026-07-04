import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { QUERY_KEYS } from '@/constants';
import { useCategories } from '@/hooks/catalog';
import { useCashSession } from '@/hooks/cash';
import { useDiningRoom, useSellableProducts, useTableAccount } from '@/hooks/operations';
import { useActiveBranch } from '@/hooks/tenancy';
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

/* Memoizado: el grid puede tener 200+ productos y no debe re-renderizar
   completo en cada tecla del buscador ni en cada mutacion de la comanda. */
const ProductCardButton = memo(function ProductCardButton({
  product,
  disabled,
  onAdd,
}: {
  product: ProductDto;
  disabled: boolean;
  onAdd: (product: ProductDto) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(product)}
      data-cy="pos-product-card"
      className="motion-press flex min-h-[118px] flex-col gap-3 rounded-[18px] border border-[#E7E0D6] bg-white p-4 text-left shadow-sm shadow-carbon/5 transition hover:-translate-y-0.5 hover:border-orange/60 hover:bg-[#FFF8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 disabled:opacity-60"
    >
      <span className="line-clamp-2 min-h-[36px] flex-1 text-[14.5px] font-semibold leading-tight text-[#1C1A17]">
        {product.name}
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="nums text-sm font-bold text-[#1C1A17]">
          {formatMoney(product.priceAmount, product.currency)}
        </span>
        <span className="grid size-8 place-items-center rounded-[11px] bg-[#FFF1EB] text-xl font-bold leading-none text-orange">
          +
        </span>
      </span>
    </button>
  );
});

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

  // Reset only when the actual table changes; resetting on every `table`
  // object identity change (zones refetch) would wipe what the user typed.
  useEffect(() => {
    form.reset({
      waiterName: table.waiterName ?? defaultWaiterName,
      guestCount: table.seats,
      customerName: table.reservationName ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, table.id]);

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
        <div className="grid gap-3 sm:grid-cols-2">
          {autoAssignWaiter ? (
            <div className="rounded-xl border border-[#E7E0D6] bg-white px-3 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Mesero asignado</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {defaultWaiterName || 'Tu usuario'}
              </p>
            </div>
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
  const activeBranch = useActiveBranch();
  const activeBranchId = activeBranch?.id ?? user?.branchId ?? undefined;
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [command, setCommand] = useState<KitchenCommandDto | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [cashRequiredOpen, setCashRequiredOpen] = useState(false);
  const [openAccountDialogOpen, setOpenAccountDialogOpen] = useState(false);
  const [comandaSheetOpen, setComandaSheetOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<ProductDto | null>(null);
  const [shouldReturnToTablesAfterReceipt, setShouldReturnToTablesAfterReceipt] = useState(false);

  const diningRoom = useDiningRoom();
  const cash = useCashSession();
  const productsQuery = useSellableProducts();
  const categoriesQuery = useCategories();
  const account = useTableAccount(activeTableId);
  const waitersQuery = useQuery({
    queryKey: [QUERY_KEYS.employees, { role: 'WAITER', isActive: true, branchId: activeBranchId }],
    queryFn: () =>
      EmployeeService.getEmployees({
        page: 1,
        pageSize: 100,
        role: 'WAITER',
        isActive: true,
        branchId: activeBranchId,
      }),
    enabled: Boolean(activeBranchId),
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
  const currentItemCount =
    currentAccount?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const waiterOptions = useMemo(() => {
    const names = (waitersQuery.data?.data ?? []).map((employee) => employee.fullName);
    return Array.from(new Set(names.filter((name) => Boolean(name.trim()))));
  }, [waitersQuery.data?.data]);
  const isAuthenticatedWaiter = user?.role === 'WAITER';
  const defaultWaiterName = isAuthenticatedWaiter ? user.fullName : table?.waiterName ?? '';

  // Las mutaciones de items (add/update/remove) son optimistas y no bloquean
  // la toma de pedido; solo bloquean los flujos que cambian el estado de la cuenta.
  const isMutating =
    account.openAccountMutation.isPending ||
    account.commandMutation.isPending ||
    account.receiptMutation.isPending ||
    account.chargeMutation.isPending ||
    cash.activeSessionQuery.isFetching;

  const deferredSearch = useDeferredValue(search);
  const visibleProducts = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === ALL || product.categoryId === activeCategory;
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.sku ?? '').toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, deferredSearch]);

  const categoryTabs = [
    { id: ALL, name: 'Todos' },
    ...categories.map((category) => ({ id: category.id, name: category.name })),
  ];

  const handleOpenAccount = async (values: OpenTableAccountValues) => {
    try {
      const productToAdd = pendingProduct;
      const openedAccount = await account.openAccountMutation.mutateAsync(values);
      setOpenAccountDialogOpen(false);
      setPendingProduct(null);
      appToast.success(
        'Cuenta abierta',
        table ? `Mesa ${table.number} lista para tomar pedido.` : undefined,
      );
      if (productToAdd) {
        try {
          await account.addItemMutation.mutateAsync({
            saleId: openedAccount.id,
            payload: { productId: productToAdd.id, quantity: 1 },
            product: { name: productToAdd.name, unitPriceAmount: productToAdd.priceAmount },
          });
        } catch (error) {
          appToast.error(
            'No se pudo agregar el producto',
            error instanceof Error ? error.message : 'La cuenta quedo abierta; intenta agregarlo de nuevo.',
          );
        }
      }
    } catch (error) {
      appToast.error(
        'No se pudo abrir la cuenta',
        error instanceof Error ? error.message : 'Intenta nuevamente.',
      );
    }
  };

  const addItemMutateAsync = account.addItemMutation.mutateAsync;
  const handleAddProduct = useCallback(
    async (product: ProductDto) => {
      if (!currentAccount) {
        setPendingProduct(product);
        setOpenAccountDialogOpen(true);
        return;
      }
      try {
        await addItemMutateAsync({
          saleId: currentAccount.id,
          payload: { productId: product.id, quantity: 1 },
          product: { name: product.name, unitPriceAmount: product.priceAmount },
        });
      } catch (error) {
        appToast.error(
          'No se pudo agregar el producto',
          error instanceof Error ? error.message : 'Intenta nuevamente.',
        );
      }
    },
    [currentAccount, addItemMutateAsync, appToast],
  );

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

      if (comandaSheetOpen) {
        setComandaSheetOpen(false);
        appToast.success('Cuenta solicitada', `Mesa ${table?.number ?? ''} · enviada a caja`.trim(), {
          duration: 2600,
        });
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

  const handleOpenAccountDialogChange = (open: boolean) => {
    setOpenAccountDialogOpen(open);
    if (!open) {
      setPendingProduct(null);
    }
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
      <div
        className="mx-auto grid min-h-[calc(100dvh-120px)] max-w-[1360px] gap-4 max-lg:h-[calc(100dvh-152px)] max-lg:min-h-0 sm:max-lg:h-[calc(100dvh-156px)] lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-[18px]"
        data-cy="pos-page"
      >
        <section className="flex min-w-0 flex-col rounded-[26px] border border-[#E7E0D6] bg-[#FCFAF6] p-3 shadow-sm shadow-carbon/5 max-lg:min-h-0 max-lg:overflow-hidden max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none sm:p-4">
          <div className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-3 max-lg:-mt-3 max-lg:bg-background max-lg:px-3 max-lg:pt-3 max-lg:pb-1 sm:max-lg:-mx-4 sm:max-lg:-mt-4 sm:max-lg:px-4 sm:max-lg:pt-4">
          <div className="mb-4 rounded-[20px] border border-[#E7E0D6] bg-white p-3">
            <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/tables"
              className="motion-press flex min-h-11 items-center gap-2.5 rounded-[14px] border border-[#E7E0D6] bg-[#F6F2EC] px-3 hover:-translate-y-0.5 hover:border-orange/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
              title="Volver a mesas"
            >
              <span className="nums text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mesa</span>
              <span className="font-display text-[17px] font-bold">{table.number}</span>
            </Link>
            <div className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-[14px] border border-[#E7E0D6] bg-[#F6F2EC] px-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-orange/15 text-[11px] font-bold text-[#B5491F]">
                {displayWaiterName ? initials(displayWaiterName) : '--'}
              </span>
              <span className="truncate text-[13px] font-semibold">
                {waiterLabel}
              </span>
            </div>
            <div className="relative w-full sm:ml-auto sm:w-[320px] sm:shrink-0">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto o código…"
                className="h-11 rounded-[14px] border-[#E7E0D6] bg-[#FCFAF6] pl-9"
                data-cy="pos-product-search"
              />
            </div>
          </div>

          </div>

          <div className="scrollbar-none -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2 max-lg:mb-0">
            {categoryTabs.map((category) => {
              const isActive = category.id === activeCategory;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'motion-press min-h-10 shrink-0 rounded-full border px-4 text-[13.5px] font-semibold',
                    isActive
                      ? 'border-carbon bg-carbon text-white shadow-sm'
                      : 'border-[#E7E0D6] bg-white text-[#312C26] hover:border-carbon/50',
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-1 pt-2 pb-32 max-lg:-mx-1 lg:pb-0">
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(142px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
                {Array.from({ length: 1 }, (_, index) => (
                  <Skeleton key={index} className="h-[118px] rounded-[18px]" />
                ))}
              </div>
            ) : productsQuery.isError ? (
              <div
                className="rounded-[20px] border border-destructive/25 bg-danger-soft p-8 text-center"
                data-cy="pos-products-error"
              >
                <p className="text-sm font-semibold text-destructive">
                  No se pudo cargar el menú.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revisa la conexión e intenta de nuevo.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-11"
                  onClick={() => void productsQuery.refetch()}
                >
                  Reintentar
                </Button>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-[#D8D0C5] bg-white p-10 text-center text-sm text-muted-foreground">
                No hay productos en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(142px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
                {visibleProducts.map((product) => (
                  <ProductCardButton
                    key={product.id}
                    product={product}
                    disabled={isMutating}
                    onAdd={handleAddProduct}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 bg-gradient-to-t from-[#F6F2EC] from-60% to-transparent px-3 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
            <AnimatePresence mode="wait" initial={false}>
              {currentAccount && currentItemCount > 0 ? (
                <motion.button
                  key="filled"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  type="button"
                  onClick={() => setComandaSheetOpen(true)}
                  data-cy="pos-mobile-cart-bar"
                  className="motion-press pointer-events-auto flex w-full items-center gap-3 rounded-[18px] bg-carbon px-4 py-3 text-left text-white shadow-xl shadow-carbon/25"
                >
                  <span
                    key={`badge-${currentItemCount}`}
                    className="pos-pop-badge nums grid size-11 shrink-0 place-items-center rounded-[13px] bg-orange font-display text-lg font-extrabold text-carbon"
                  >
                    {currentItemCount}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="nums block text-xs text-white/55">Ver comanda</span>
                    <span
                      key={`total-${currentAccount.grandTotal}`}
                      className="pos-pop-soft nums block text-xl font-bold"
                    >
                      {formatMoney(currentAccount.grandTotal, currency)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-[12px] bg-orange px-4 py-2.5 text-sm font-bold text-carbon">
                    Cuenta
                    <ArrowRight className="size-4" />
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  type="button"
                  onClick={() => setComandaSheetOpen(true)}
                  data-cy="pos-mobile-cart-bar-empty"
                  className="motion-press pointer-events-auto flex w-full items-center gap-3 rounded-[18px] border border-dashed border-[#D8D0C5] bg-white p-4 text-left"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#F6F2EC] text-[#B0A89C]">
                    <ShoppingCart className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-[#6B6359]">
                      {currentAccount ? 'Comanda vacía' : 'Sin cuenta abierta'}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {currentAccount
                        ? 'Toca un producto para empezar'
                        : 'Toca aquí para abrir la cuenta'}
                    </span>
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </section>

        <aside
          id="pos-comanda"
          className="hidden w-full shrink-0 flex-col scroll-mt-4 lg:sticky lg:top-4 lg:flex lg:self-start"
        >
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
                autoAssignWaiter={isAuthenticatedWaiter}
                isSubmitting={isMutating}
                isLoadingWaiters={waitersQuery.isLoading}
                onSubmit={handleOpenAccount}
              />
            }
          />
        </aside>
      </div>

      <Sheet open={comandaSheetOpen} onOpenChange={setComandaSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="pos-sheet max-h-[88dvh] gap-0 overflow-hidden rounded-t-[26px] border-none bg-[#FCFAF6] p-0 lg:hidden"
          data-cy="pos-comanda-sheet"
        >
          <SheetTitle className="sr-only">Comanda</SheetTitle>
          <button
            type="button"
            aria-label="Cerrar comanda"
            onClick={() => setComandaSheetOpen(false)}
            className="flex shrink-0 justify-center py-2.5"
          >
            <span className="h-1.5 w-11 rounded-full bg-[#D8D0C5]" />
          </button>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <ComandaPanel
              account={currentAccount ?? null}
              tableNumber={table.number}
              waiterLabel={waiterLabel}
              isMutating={isMutating}
              isLoadingAccount={account.accountQuery.isLoading}
              onQuantityChange={(itemId, quantity) => void handleQuantityChange(itemId, quantity)}
              onCommand={() => void handleCommand()}
              onCharge={() => void handleOpenChargeDialog()}
              className="min-h-[300px]"
              emptyState={
                <OpenAccountForm
                  table={table}
                  defaultWaiterName={defaultWaiterName}
                  waiterOptions={waiterOptions}
                  autoAssignWaiter={isAuthenticatedWaiter}
                  isSubmitting={isMutating}
                  isLoadingWaiters={waitersQuery.isLoading}
                  onSubmit={handleOpenAccount}
                />
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={openAccountDialogOpen} onOpenChange={handleOpenAccountDialogChange}>
        <DialogContent className="max-w-[calc(100vw-24px)] rounded-[24px] border-[#E7E0D6] bg-[#FCFAF6] p-0 sm:max-w-md">
          <div className="border-b border-[#E7E0D6] bg-white px-5 py-4">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-orange/12 text-orange">
                  <UtensilsCrossed className="size-5" />
                </span>
                <div className="min-w-0 text-left">
                  <DialogTitle className="font-display text-xl">
                    Asignar mesero
                  </DialogTitle>
                  <DialogDescription>
                    Mesa {table.number}
                    {pendingProduct ? ` - ${pendingProduct.name}` : ''}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="px-5 py-5">
            {!isAuthenticatedWaiter ? (
              <p className="mb-4 rounded-xl border border-[#E7E0D6] bg-white px-3 py-2 text-sm text-[#6B6359]">
                Escoge un mesero activo para abrir la cuenta. Luego podras agregar productos,
                enviar comanda y cobrar.
              </p>
            ) : null}
            <OpenAccountForm
              table={table}
              defaultWaiterName={defaultWaiterName}
              waiterOptions={waiterOptions}
              autoAssignWaiter={isAuthenticatedWaiter}
              isSubmitting={isMutating}
              isLoadingWaiters={waitersQuery.isLoading}
              onSubmit={handleOpenAccount}
            />
          </div>
        </DialogContent>
      </Dialog>

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
