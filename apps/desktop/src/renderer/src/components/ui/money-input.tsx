import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  /** Clean integer value in minor/whole units (no formatting). The source of truth. */
  value: number | null | undefined;
  /** Emits the clean integer (0 when empty) — safe to send straight to the API. */
  onChange: (value: number) => void;
};

const THOUSANDS = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** Formats the data value for display: 1500000 → "1.500.000". */
function toDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return THOUSANDS.format(value);
}

/** Extracts the clean integer from typed text: "1.500.000" / "$1.500" → 1500000 / 1500. */
function toValue(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

/**
 * Currency input for COP. Shows a thousands-separated mask while typing but keeps the
 * visual state derived from the numeric data, emitting the clean integer to the parent
 * (and therefore to the NestJS payload). No spinner controls.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={toDisplay(value)}
      onChange={(event) => onChange(toValue(event.target.value))}
      className={cn('nums', className)}
      {...props}
    />
  );
});
