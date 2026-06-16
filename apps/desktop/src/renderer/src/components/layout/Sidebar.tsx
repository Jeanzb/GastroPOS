import { Link } from '@tanstack/react-router';
import { Package } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark className="h-8 w-8" />
        <Wordmark className="text-lg" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          activeProps={{ className: 'bg-sidebar-accent text-sidebar-foreground' }}
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  isActive ? 'bg-orange' : 'bg-sidebar-foreground/30',
                )}
              />
              <Package className="h-4 w-4" />
              Productos
            </>
          )}
        </Link>
      </nav>

      <p className="px-5 py-4 text-xs text-sidebar-foreground/40">GastroAI v0.1.0</p>
    </aside>
  );
}
