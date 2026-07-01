import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveActionBarProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function ResponsiveActionBar({
  children,
  className,
  sticky = false,
}: ResponsiveActionBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
        sticky &&
          'sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/92 px-4 py-3 backdrop-blur md:-mx-6 md:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
