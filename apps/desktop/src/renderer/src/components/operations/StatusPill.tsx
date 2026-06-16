import { cn } from '@/lib/utils';

type StatusTone = 'green' | 'amber' | 'red' | 'orange' | 'neutral';

interface StatusPillProps {
  children: string;
  tone?: StatusTone;
  className?: string;
}

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  orange: 'border-orange/20 bg-orange/10 text-orange',
  neutral: 'border-border bg-muted text-muted-foreground',
};

export function StatusPill({ children, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium',
        STATUS_TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
