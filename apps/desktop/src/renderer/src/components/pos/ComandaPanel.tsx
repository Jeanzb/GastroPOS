import { type ReactNode, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Minus, Plus, Printer, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TableAccountDto } from '@/types/dining';

type TableAccountItemDto = TableAccountDto['items'][number];

const TAX_RATE = 0.08;

interface ComandaPanelProps {
  account: TableAccountDto | null;
  tableNumber: string;
  waiterLabel: string;
  isMutating: boolean;
  isLoadingAccount: boolean;
  emptyState: ReactNode;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onCommand: () => void;
  onCharge: () => void;
  className?: string;
}

function formatClock(value?: string): string {
  const date = value ? new Date(value) : new Date();
  return date
    .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
}

export function ComandaPanel({
  account,
  tableNumber,
  waiterLabel,
  isMutating,
  isLoadingAccount,
  emptyState,
  onQuantityChange,
  onCommand,
  onCharge,
  className,
}: ComandaPanelProps) {
  const reduceMotion = useReducedMotion();
  // Visual-only overrides — they tune the on-screen comanda, not the persisted sale.
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  const items = account?.items ?? [];
  const priceFor = (item: TableAccountItemDto) => priceOverrides[item.id] ?? item.unitPriceAmount;
  const lineTotalFor = (item: TableAccountItemDto) => priceFor(item) * item.quantity;

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + priceFor(item) * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    return {
      subtotal,
      tax,
      total: subtotal + tax,
      units: items.reduce((sum, item) => sum + item.quantity, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, priceOverrides]);

  const currency = account?.currency ?? 'COP';

  return (
    <div
      className={cn(
        'flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-[26px] border border-[#E7E0D6] bg-[#FCFAF6] shadow-sm shadow-carbon/5 lg:min-h-0',
        className,
      )}
    >
      <div className="h-1.5 bg-orange/80" />

      {!account ? (
        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="font-display text-[18px] font-bold">Comanda</span>
          </div>
          <p className="nums mt-1 text-[11px] text-muted-foreground">MESA {tableNumber}</p>
          <div className="mt-3.5 mb-4 border-b border-dashed border-[#D8D0C5]" />
          {isLoadingAccount ? <Skeleton className="h-44 rounded-xl" /> : emptyState}
        </div>
      ) : (
        <>
          <div className="px-5 pt-[18px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[18px] font-bold">Comanda</span>
                <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-success">
                  Abierta
                </span>
              </div>
              <span
                key={totals.units}
                className={cn(
                  'nums grid size-6 place-items-center rounded-full bg-orange text-[11px] font-bold text-white',
                  !reduceMotion && 'pos-pop-badge',
                )}
                aria-label={`${totals.units} unidades`}
              >
                {totals.units}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Chip>MESA {tableNumber}</Chip>
              <Chip>{waiterLabel}</Chip>
              <Chip>{formatClock(items[0]?.createdAt)}</Chip>
              <span className="nums ml-auto text-[11px] text-muted-foreground">
                #{account.id.slice(-4).toUpperCase()}
              </span>
            </div>
            <div className="mt-3.5 border-b border-dashed border-[#D8D0C5]" />
          </div>

          <div className="flex-1 overflow-y-auto px-5">
            {items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ReceiptText className="mx-auto size-7" />
                <p className="mt-2 text-[13.5px] font-semibold text-[#6B6359]">Comanda vacía</p>
                <p className="mt-1 text-[12.5px]">Toca un producto para empezar</p>
              </div>
            ) : (
              <motion.ul layout className="flex flex-col">
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      data-cy="pos-order-item"
                      initial={reduceMotion ? false : { opacity: 0, height: 0, x: 14 }}
                      animate={{ opacity: 1, height: 'auto', x: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0, x: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden border-b border-dashed border-[#ECE6DD]"
                    >
                      <div className="flex items-center gap-3 py-3">
                        <Stepper
                          quantity={item.quantity}
                          name={item.name}
                          disabled={isMutating}
                          reduceMotion={reduceMotion}
                          onDec={() => onQuantityChange(item.id, Math.max(0, item.quantity - 1))}
                          onInc={() => onQuantityChange(item.id, item.quantity + 1)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold leading-tight">
                            {item.name}
                          </p>
                          <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg border border-[#E7DECF] bg-surface-quiet px-2 py-[3px] transition-colors focus-within:border-orange/50 focus-within:bg-orange/5">
                            <span className="nums text-[11px] font-semibold text-[#8A8173]">$</span>
                            <MoneyInput
                              value={priceFor(item)}
                              onChange={(value) =>
                                setPriceOverrides((prev) => ({ ...prev, [item.id]: value }))
                              }
                              aria-label={`Precio unitario de ${item.name}`}
                              className="h-5 w-[58px] border-transparent bg-transparent px-0 text-left text-[12px] font-semibold text-foreground shadow-none focus-visible:ring-0"
                            />
                            <span className="text-[10.5px] text-muted-foreground">c/u</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <AnimatedAmount
                            value={lineTotalFor(item)}
                            currency={currency}
                            reduceMotion={reduceMotion}
                            className="nums text-sm font-bold"
                          />
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => onQuantityChange(item.id, 0)}
                            className="-mr-1.5 min-h-8 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:text-[#C0431A] active:bg-[#FBEAE4] disabled:opacity-50"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </div>

          <div className="border-t border-dashed border-[#D8D0C5] bg-white px-5 pb-5 pt-4">
            <div className="mb-1.5 flex items-center justify-between text-[13px] text-[#6B6359]">
              <span>Subtotal</span>
              <AnimatedAmount
                value={totals.subtotal}
                currency={currency}
                reduceMotion={reduceMotion}
                className="nums font-semibold text-foreground"
              />
            </div>
            <div className="mb-3 flex items-center justify-between text-[13px] text-[#6B6359]">
              <span>Impuesto al consumo (8%)</span>
              <AnimatedAmount
                value={totals.tax}
                currency={currency}
                reduceMotion={reduceMotion}
                className="nums font-semibold text-foreground"
              />
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-[#D8D0C5] pt-3">
              <span className="font-display text-[17px] font-bold">Total</span>
              <AnimatedAmount
                value={totals.total}
                currency={currency}
                reduceMotion={reduceMotion}
                className="nums text-2xl font-bold tracking-tight"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                disabled={isMutating || items.length === 0}
                onClick={onCommand}
                data-cy="pos-command"
              >
                <Printer className="size-4" />
                Imprimir
              </Button>
              <motion.div
                className="flex-[1.4]"
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  type="button"
                  className="min-h-11 w-full active:bg-[#E8451A] active:text-white"
                  disabled={isMutating || items.length === 0}
                  onClick={onCharge}
                  data-cy="pos-charge-open"
                >
                  Solicitar cuenta
                  <ArrowRight className="size-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="nums rounded-md bg-surface-quiet px-2 py-0.5 text-[11px] font-semibold text-[#6B6359]">
      {children}
    </span>
  );
}

function Stepper({
  quantity,
  name,
  disabled,
  reduceMotion,
  onDec,
  onInc,
}: {
  quantity: number;
  name: string;
  disabled: boolean;
  reduceMotion: boolean | null;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-border">
      <motion.button
        type="button"
        disabled={disabled}
        aria-label={`Restar ${name}`}
        onClick={onDec}
        whileTap={reduceMotion ? undefined : { scale: 0.85 }}
        className="grid h-10 w-9 place-items-center bg-surface-quiet text-[#6B6359] transition-colors active:bg-[#E4DCCF] disabled:opacity-50"
      >
        <Minus className="size-4" />
      </motion.button>
      <span className="nums w-8 text-center text-sm font-bold">
        <span key={quantity} className={cn('block', !reduceMotion && 'pos-pop-qty')}>
          {quantity}
        </span>
      </span>
      <motion.button
        type="button"
        disabled={disabled}
        aria-label={`Sumar ${name}`}
        onClick={onInc}
        whileTap={reduceMotion ? undefined : { scale: 0.85 }}
        className="grid h-10 w-9 place-items-center bg-surface-quiet text-[#6B6359] transition-colors active:bg-[#E4DCCF] disabled:opacity-50"
      >
        <Plus className="size-4" />
      </motion.button>
    </div>
  );
}

function AnimatedAmount({
  value,
  currency,
  reduceMotion,
  className,
}: {
  value: number;
  currency: string;
  reduceMotion: boolean | null;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-block', className)}>
      <span key={value} className={cn('block', !reduceMotion && 'pos-pop-soft')}>
        {formatMoney(value, currency)}
      </span>
    </span>
  );
}
