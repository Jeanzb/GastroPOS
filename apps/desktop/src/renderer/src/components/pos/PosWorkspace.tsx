import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChefHat,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ChargeDialog, CommandDialog, ReceiptDialog } from '@/components/dining/AccountDialogs';
import { Button } from '@/components/ui/button';
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
import { useCategories } from '@/hooks/catalog';
import { useDiningRoom, useSellableProducts, useTableAccount } from '@/hooks/operations';
import { useAppToast } from '@/hooks/ui';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  openTableAccountSchema,
  type ChargeTableAccountValues,
  type OpenTableAccountValues,
} from '@/schemas/dining';
import { useAuthStore, useOrderStore } from '@/stores';
import type { ProductDto } from '@/types/catalog';
import type { DiningTableDto, KitchenCommandDto, ReceiptDto } from '@/types/dining';

const ALL = 'all';
const REGISTERED_WAITERS = ['Diego Granados', 'Laura Mejia', 'Maria Restrepo'];

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
  isSubmitting,
  onSubmit,
}: {
  table: DiningTableDto;
  defaultWaiterName: string;
  waiterOptions: string[];
  isSubmitting: boolean;
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="waiterName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mesero</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
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
        <Button type="submit" className="w-full" disabled={isSubmitting} data-cy="pos-open-account">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Abrir cuenta
        </Button>
      </form>
    </Form>
  );
}

export function PosWorkspace() {
  const appToast = useAppToast();
  const activeTableId = useOrderStore((state) => state.activeTableId);
  const user = useAuthStore((state) => state.user);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [command, setCommand] = useState<KitchenCommandDto | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);

  const diningRoom = useDiningRoom();
  const productsQuery = useSellableProducts();
  const categoriesQuery = useCategories();
  const account = useTableAccount(activeTableId);

  const zones = diningRoom.zonesQuery.data ?? [];
  const table = useMemo(
    () => zones.flatMap((zone) => zone.tables).find((item) => item.id === activeTableId) ?? null,
    [zones, activeTableId],
  );
  const currentAccount = account.accountQuery.data;
  const products = productsQuery.data ?? [];
  const categories = (categoriesQuery.listQuery.data?.data ?? []).filter((c) => c.isActive);
  const mesero = currentAccount?.waiterName ?? user?.fullName ?? 'Mesero';
  const currency = currentAccount?.currency ?? products[0]?.currency ?? 'COP';
  const waiterOptions = useMemo(() => {
    const names = [user?.fullName, ...REGISTERED_WAITERS].filter(
      (name): name is string => Boolean(name?.trim()),
    );

    return Array.from(new Set(names));
  }, [user?.fullName]);
  const defaultWaiterName = table?.waiterName ?? waiterOptions[0] ?? 'Mesero';

  const isMutating =
    account.openAccountMutation.isPending ||
    account.addItemMutation.isPending ||
    account.updateItemMutation.isPending ||
    account.removeItemMutation.isPending ||
    account.commandMutation.isPending ||
    account.receiptMutation.isPending ||
    account.chargeMutation.isPending;

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
                {initials(mesero)}
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold">{mesero} · Mesero</span>
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
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="h-2.5 bg-[repeating-linear-gradient(90deg,#1C1A17_0_7px,transparent_7px_14px)] opacity-90" />
            <div className="px-5 pt-[18px]">
              <div className="flex items-center justify-between">
                <span className="font-display text-[18px] font-bold">Comanda</span>
                <span className="nums text-xs text-muted-foreground">
                  {currentAccount ? `#${currentAccount.id.slice(-4).toUpperCase()}` : '—'}
                </span>
              </div>
              <p className="nums mt-1 text-[11px] text-muted-foreground">
                MESA {table.number} · {mesero}
              </p>
              <div className="mt-3.5 border-b border-dashed border-[#D8D0C5]" />
            </div>

            {!currentAccount ? (
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {account.accountQuery.isLoading ? (
                  <Skeleton className="h-44 rounded-xl" />
                ) : (
                  <OpenAccountForm
                    table={table}
                    defaultWaiterName={defaultWaiterName}
                    waiterOptions={waiterOptions}
                    isSubmitting={isMutating}
                    onSubmit={handleOpenAccount}
                  />
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5">
                  {currentAccount.items.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <ReceiptText className="mx-auto size-7" />
                      <p className="mt-2 text-[13.5px] font-semibold text-[#6B6359]">Comanda vacía</p>
                      <p className="mt-1 text-[12.5px]">Toca un producto para empezar</p>
                    </div>
                  ) : (
                    currentAccount.items.map((item) => (
                      <div
                        key={item.id}
                        data-cy="pos-order-item"
                        className="flex items-center gap-3 border-b border-dashed border-[#ECE6DD] py-3"
                      >
                        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-border">
                          <button
                            type="button"
                            disabled={isMutating}
                            aria-label={`Restar ${item.name}`}
                            onClick={() => void handleQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                            className="h-[30px] w-7 bg-surface-quiet text-lg leading-none text-[#6B6359] disabled:opacity-50"
                          >
                            <Minus className="mx-auto size-3.5" />
                          </button>
                          <span className="nums w-7 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            disabled={isMutating}
                            aria-label={`Sumar ${item.name}`}
                            onClick={() => void handleQuantityChange(item.id, item.quantity + 1)}
                            className="h-[30px] w-7 bg-surface-quiet text-base leading-none text-[#6B6359] disabled:opacity-50"
                          >
                            <Plus className="mx-auto size-3.5" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold leading-tight">{item.name}</p>
                          <p className="nums mt-0.5 text-[11px] text-muted-foreground">
                            {formatMoney(item.unitPriceAmount, currency)} c/u
                          </p>
                        </div>
                        <span className="nums text-sm font-bold">
                          {formatMoney(item.lineTotal, currency)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-dashed border-[#D8D0C5] bg-surface-raised px-5 pb-5 pt-4">
                  <div className="mb-1.5 flex justify-between text-[13px] text-[#6B6359]">
                    <span>Subtotal</span>
                    <span className="nums font-semibold text-foreground">
                      {formatMoney(currentAccount.subtotal, currency)}
                    </span>
                  </div>
                  <div className="mb-3 flex justify-between text-[13px] text-[#6B6359]">
                    <span>Impuestos</span>
                    <span className="nums font-semibold text-foreground">
                      {formatMoney(currentAccount.taxTotal, currency)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-dashed border-[#D8D0C5] pt-3">
                    <span className="font-display text-[17px] font-bold">Total</span>
                    <span className="nums text-2xl font-bold">
                      {formatMoney(currentAccount.grandTotal, currency)}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={isMutating || currentAccount.items.length === 0}
                      onClick={() => void handleCommand()}
                      data-cy="pos-command"
                    >
                      <ChefHat className="size-4" />
                      Imprimir comanda
                    </Button>
                    <Button
                      type="button"
                      className="flex-[1.4]"
                      disabled={isMutating || currentAccount.items.length === 0}
                      onClick={() => setChargeOpen(true)}
                      data-cy="pos-charge-open"
                    >
                      <CreditCard className="size-4" />
                      Cobrar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <CommandDialog command={command} open={Boolean(command)} onOpenChange={(open) => !open && setCommand(null)} />
      <ReceiptDialog receipt={receipt} open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)} />
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
