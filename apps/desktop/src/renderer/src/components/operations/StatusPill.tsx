import { cn } from '@/lib/utils';

type StatusTone = 'green' | 'amber' | 'red' | 'orange' | 'neutral';

interface StatusPillProps {
  children: string;
  tone?: StatusTone;
  className?: string;
}

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  green: 'border-success/20 bg-success-soft text-success',
  amber: 'border-warning/25 bg-warning-soft text-amber-800',
  red: 'border-destructive/20 bg-danger-soft text-destructive',
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
