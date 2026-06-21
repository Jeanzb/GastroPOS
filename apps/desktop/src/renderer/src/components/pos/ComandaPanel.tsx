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
}: ComandaPanelProps) {
  const reduceMotion = useReducedMotion();
  // Visual-only overrides — they tune the on-screen comanda, not the persisted sale.
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [discountOverride, setDiscountOverride] = useState<number | null>(null);

  const items = account?.items ?? [];
  const priceFor = (item: TableAccountItemDto) => priceOverrides[item.id] ?? item.unitPriceAmount;
  const lineTotalFor = (item: TableAccountItemDto) => priceFor(item) * item.quantity;

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + priceFor(item) * item.quantity, 0);
    const discount = discountOverride ?? account?.discountTotal ?? 0;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * TAX_RATE);
    return {
      subtotal,
      discount,
      tax,
      total: taxable + tax,
      units: items.reduce((sum, item) => sum + item.quantity, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, priceOverrides, discountOverride, account?.discountTotal]);

  const currency = account?.currency ?? 'COP';
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.7 };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-2.5 bg-[repeating-linear-gradient(90deg,#1C1A17_0_7px,transparent_7px_14px)] opacity-90" />

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
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={totals.units}
                  initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
                  transition={transition}
                  className="nums grid size-6 place-items-center rounded-full bg-orange text-[11px] font-bold text-white"
                  aria-label={`${totals.units} unidades`}
                >
                  {totals.units}
                </motion.span>
              </AnimatePresence>
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
                      initial={reduceMotion ? false : { opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -6 }}
                      transition={transition}
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
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">$</span>
                            <MoneyInput
                              value={priceFor(item)}
                              onChange={(value) =>
                                setPriceOverrides((prev) => ({ ...prev, [item.id]: value }))
                              }
                              aria-label={`Precio unitario de ${item.name}`}
                              className="h-6 w-[78px] rounded-md border-transparent bg-surface-quiet px-1.5 text-left text-[11px] focus-visible:border-orange/40"
                            />
                            <span className="text-[11px] text-muted-foreground">c/u</span>
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
                            className="text-[11px] text-muted-foreground transition-colors hover:text-[#C0431A] disabled:opacity-50"
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

          <div className="border-t border-dashed border-[#D8D0C5] bg-surface-raised px-5 pb-5 pt-4">
            <div className="mb-1.5 flex items-center justify-between text-[13px] text-[#6B6359]">
              <span>Subtotal</span>
              <AnimatedAmount
                value={totals.subtotal}
                currency={currency}
                reduceMotion={reduceMotion}
                className="nums font-semibold text-foreground"
              />
            </div>
            <div className="mb-1.5 flex items-center justify-between text-[13px] text-[#6B6359]">
              <span>Descuento</span>
              <div className="flex items-center gap-1">
                <span className="text-[12px]">-$</span>
                <MoneyInput
                  value={totals.discount}
                  onChange={(value) => setDiscountOverride(value)}
                  aria-label="Descuento"
                  className="h-6 w-[88px] rounded-md border-transparent bg-card px-1.5 text-right text-[12px] focus-visible:border-orange/40"
                />
              </div>
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

            <div className="mt-4 flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isMutating || items.length === 0}
                onClick={onCommand}
                data-cy="pos-command"
              >
                <Printer className="size-4" />
                Imprimir
              </Button>
              <motion.div
                className="flex-[1.4]"
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              >
                <Button
                  type="button"
                  className="w-full"
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
        className="grid h-[30px] w-7 place-items-center bg-surface-quiet text-[#6B6359] disabled:opacity-50"
      >
        <Minus className="size-3.5" />
      </motion.button>
      <span className="nums w-7 overflow-hidden text-center text-sm font-bold">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={quantity}
            initial={reduceMotion ? false : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: -10, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="block"
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.button
        type="button"
        disabled={disabled}
        aria-label={`Sumar ${name}`}
        onClick={onInc}
        whileTap={reduceMotion ? undefined : { scale: 0.85 }}
        className="grid h-[30px] w-7 place-items-center bg-surface-quiet text-[#6B6359] disabled:opacity-50"
      >
        <Plus className="size-3.5" />
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
    <span className={cn('relative inline-block overflow-hidden', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduceMotion ? false : { y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: -12, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="block"
        >
          {formatMoney(value, currency)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
