import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MetricSummary } from '@/types/operations';

interface MetricCardProps {
  metric: MetricSummary;
}

const TREND_STYLES = {
  up: {
    icon: ArrowUpRight,
    className: 'bg-success-soft text-success',
  },
  down: {
    icon: ArrowDownRight,
    className: 'bg-warning-soft text-[#9A6A1C]',
  },
  neutral: {
    icon: ArrowRight,
    className: 'bg-surface-quiet text-muted-foreground',
  },
};

export function MetricCard({ metric }: MetricCardProps) {
  const trendStyle = TREND_STYLES[metric.direction];
  const TrendIcon = trendStyle.icon;

  return (
    <Card className="motion-press group gap-4 overflow-hidden rounded-2xl border-border/80 bg-surface-raised py-5 hover:-translate-y-0.5 hover:border-orange/35 hover:shadow-md">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="nums mt-2 font-display text-2xl">{metric.value}</CardTitle>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-orange shadow-[0_0_0_4px_rgba(255,90,44,0.12)]" />
        </div>
      </CardHeader>
      <CardContent className="px-5">
        <div
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-[7px] px-2.5 text-xs font-bold',
            trendStyle.className,
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{metric.trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
