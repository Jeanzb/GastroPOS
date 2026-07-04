import type { ElementType, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, CircleOff, Clock3, ShieldAlert } from 'lucide-react';
import type { TenantStatus } from '@gastroai/contracts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  TenantStatus,
  { label: string; className: string; icon: ElementType }
> = {
  TRIAL: {
    label: 'Trial',
    className: 'border-orange/25 bg-orange/10 text-orange',
    icon: Clock3,
  },
  ACTIVE: {
    label: 'Activo',
    className: 'border-emerald-700/20 bg-emerald-700/10 text-emerald-700',
    icon: CheckCircle2,
  },
  PAST_DUE: {
    label: 'En mora',
    className: 'border-warning/30 bg-warning-soft text-warning',
    icon: ShieldAlert,
  },
  SUSPENDED: {
    label: 'Suspendido',
    className: 'border-destructive/25 bg-danger-soft text-destructive',
    icon: CircleOff,
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'border-carbon/15 bg-carbon/10 text-carbon',
    icon: CircleOff,
  },
  ARCHIVED: {
    label: 'Archivado',
    className: 'border-carbon/15 bg-carbon/10 text-carbon',
    icon: CircleOff,
  },
};

interface PlatformStatusBadgeProps {
  status: TenantStatus;
  className?: string;
}

export function PlatformStatusBadge({ status, className }: PlatformStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold', config.className, className)}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

interface PlatformMetricCardProps {
  icon: ElementType;
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const TONE_CLASSES = {
  default: 'text-orange bg-orange/10',
  success: 'text-emerald-700 bg-emerald-700/10',
  warning: 'text-warning bg-warning-soft',
  danger: 'text-destructive bg-danger-soft',
} as const;

export function PlatformMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: PlatformMetricCardProps) {
  return (
    <Card className="platform-card rounded-xl border-carbon/10 bg-white/86 shadow-sm">
      <CardContent className="relative z-[1] pt-6">
        <div className={cn('mb-5 grid size-10 place-items-center rounded-xl', TONE_CLASSES[tone])}>
          <Icon className="size-5" />
        </div>
        <p className="nums text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-sm font-medium text-carbon/70">{label}</p>
        {hint ? <p className="mt-3 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

interface PlatformStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: 'default' | 'danger';
}

export function PlatformState({
  title,
  description,
  action,
  tone = 'default',
}: PlatformStateProps) {
  return (
    <div
      className={cn(
        'platform-motion-in flex items-start gap-3 rounded-xl border bg-white/76 p-4 text-sm shadow-sm',
        tone === 'danger' ? 'border-destructive/20 bg-danger-soft/60' : 'border-carbon/10',
      )}
    >
      <div
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-orange/10 text-orange',
        )}
      >
        <AlertCircle className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{description}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function PlatformCardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-36 rounded-xl bg-carbon/8" />
    </div>
  );
}
