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
    className: 'text-emerald-700',
  },
  down: {
    icon: ArrowDownRight,
    className: 'text-red-700',
  },
  neutral: {
    icon: ArrowRight,
    className: 'text-muted-foreground',
  },
};

export function MetricCard({ metric }: MetricCardProps) {
  const trendStyle = TREND_STYLES[metric.direction];
  const TrendIcon = trendStyle.icon;

  return (
    <Card className="gap-4 border-border/80 py-5 shadow-none">
      <CardHeader className="px-5">
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="font-display text-2xl">{metric.value}</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <div
          className={cn('inline-flex items-center gap-1 text-xs font-medium', trendStyle.className)}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{metric.trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
