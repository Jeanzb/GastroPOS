import type { SalesSummaryDto } from '@gastroai/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

const HOURS = Array.from({ length: 16 }, (_, index) => index + 7);

function formatHour(hour: number): string {
  if (hour === 12) {
    return '12m';
  }
  return hour > 12 ? `${hour - 12}p` : `${hour}a`;
}

export function HourlySalesChart({
  summary,
  isLoading,
  isError,
}: {
  summary?: SalesSummaryDto;
  isLoading: boolean;
  isError: boolean;
}) {
  const points = HOURS.map((hour) => ({
    hour,
    amount: summary?.byHour.find((point) => point.hour === hour)?.amount ?? 0,
  }));
  const maxAmount = Math.max(...points.map((point) => point.amount), 0);
  const peak = points.reduce((current, point) => (point.amount > current.amount ? point : current), points[0]);
  const hasSales = maxAmount > 0;
  const currency = summary?.currency ?? 'COP';

  return (
    <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Ventas por hora</CardTitle>
            <CardDescription>Montos reales del dia operativo</CardDescription>
          </div>
          {hasSales ? (
            <span className="rounded-full border border-orange/20 bg-orange/10 px-2.5 py-1 text-xs font-semibold text-orange">
              Pico {formatHour(peak.hour)} - {formatMoney(peak.amount, currency)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-5">
        {isLoading ? (
          <Skeleton className="h-56 rounded-lg" />
        ) : isError ? (
          <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border bg-background/60 text-sm text-muted-foreground">
            No se pudieron cargar las ventas por hora.
          </div>
        ) : !hasSales ? (
          <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border bg-background/60 text-center text-sm text-muted-foreground">
            Sin ventas registradas en este turno.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-background/60 px-4 pt-4 pb-3">
            <div className="flex h-52 items-end gap-3">
              {points.map((point) => {
                const percent = maxAmount === 0 ? 0 : Math.max(8, (point.amount / maxAmount) * 100);
                return (
                  <div key={point.hour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="nums text-[10px] text-muted-foreground">
                      {point.amount > 0 ? formatMoney(point.amount, currency) : '-'}
                    </span>
                    <div
                      className="w-full max-w-9 rounded-t-md bg-orange shadow-sm transition-all duration-[var(--motion-duration-enter)] hover:-translate-y-1 hover:shadow-orange/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      style={{ height: `${percent}%`, opacity: point.amount > 0 ? 1 : 0.2 }}
                    />
                    <span className="nums text-[11px] text-muted-foreground">{formatHour(point.hour)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
