import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HOURLY_SALES } from '@/constants';
import { cn } from '@/lib/utils';
import type { HourlySalesPoint } from '@/types/operations';

const BAR_TONE_CLASSES: Record<HourlySalesPoint['intensity'], string> = {
  low: 'bg-orange/30',
  medium: 'bg-orange/60',
  high: 'bg-orange',
};

function HourlyBar({ point }: { point: HourlySalesPoint }) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
      <div
        className={cn(
          'w-full max-w-9 rounded-t-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-orange/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          BAR_TONE_CLASSES[point.intensity],
        )}
        style={{ height: `${point.value}px` }}
      />
      <span className="nums text-[11px] text-muted-foreground">{point.label}</span>
    </div>
  );
}

function renderHourlyBar(point: HourlySalesPoint) {
  return <HourlyBar key={point.label} point={point} />;
}

export function HourlySalesChart() {
  return (
    <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Ventas por hora</CardTitle>
            <CardDescription>Comportamiento del turno actual</CardDescription>
          </div>
          <span className="rounded-full border border-orange/20 bg-orange/10 px-2.5 py-1 text-xs font-semibold text-orange">
            Pico 12m
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex h-52 items-end gap-3 rounded-lg border border-border bg-background/60 px-4 pt-4 pb-3">
          {HOURLY_SALES.map(renderHourlyBar)}
        </div>
      </CardContent>
    </Card>
  );
}
