import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const ACCENT_VALUE: Record<NonNullable<KpiCardProps['accent']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning-strong',
  danger: 'text-danger-strong',
};

export function KpiCard({ label, value, hint, accent = 'default', className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-[18px] transition-colors hover:border-orange/35',
        className,
      )}
    >
      <p className="text-[12.5px] font-semibold text-[#6B6359]">{label}</p>
      <p className={cn('nums mt-[7px] text-[25px] font-bold leading-none', ACCENT_VALUE[accent])}>
        {value}
      </p>
      {hint ? <p className="mt-[6px] text-[11.5px] text-[#6B6359]">{hint}</p> : null}
    </div>
  );
}
