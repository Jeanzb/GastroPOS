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
          'w-full max-w-9 rounded-t-md transition-colors',
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
    <Card className="gap-4 border-border/80 py-5 shadow-none">
      <CardHeader className="px-5">
        <CardTitle>Ventas por hora</CardTitle>
        <CardDescription>Comportamiento del turno actual</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex h-52 items-end gap-3 border-b border-border pb-3">
          {HOURLY_SALES.map(renderHourlyBar)}
        </div>
      </CardContent>
    </Card>
  );
}
