import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ResponsiveDataViewProps<TData> {
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  table: ReactNode;
  renderCard: (item: TData, index: number) => ReactNode;
  getKey: (item: TData, index: number) => string;
  className?: string;
}

export function ResponsiveDataView<TData>({
  data,
  isLoading = false,
  emptyMessage = 'Sin resultados.',
  table,
  renderCard,
  getKey,
  className,
}: ResponsiveDataViewProps<TData>) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="hidden md:block">{table}</div>
      <div className="grid gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <Card key={`responsive-card-skeleton-${index}`} className="p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </Card>
            ))
          : null}

        {!isLoading && data.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{emptyMessage}</Card>
        ) : null}

        {!isLoading
          ? data.map((item, index) => (
              <div key={getKey(item, index)}>{renderCard(item, index)}</div>
            ))
          : null}
      </div>
    </div>
  );
}
