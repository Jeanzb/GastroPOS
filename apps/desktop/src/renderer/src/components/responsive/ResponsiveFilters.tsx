import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ResponsiveFiltersProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function ResponsiveFilters({
  children,
  title = 'Filtros',
  description = 'Ajusta la vista actual.',
  className,
}: ResponsiveFiltersProps) {
  return (
    <>
      <div className={cn('hidden items-center gap-3 md:flex', className)}>{children}</div>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11 w-full justify-center">
              <SlidersHorizontal className="size-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[86vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 overflow-y-auto pb-3">{children}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
