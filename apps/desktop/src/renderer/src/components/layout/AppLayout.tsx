import { useEffect, useState } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/stores';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    setNavigationOpen(false);
  }, [pathname]);

  if (!user) {
    return null;
  }

  return (
    <div className="operational-surface no-body-overflow flex h-dvh overflow-hidden bg-background">
      <Sidebar className="hidden lg:flex" />
      <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
        <SheetContent
          side="left"
          className="w-[286px] max-w-[86vw] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[320px]"
          showCloseButton={false}
          data-cy="mobile-nav"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navegacion principal</SheetTitle>
            <SheetDescription>Acceso a los modulos operativos y administrativos.</SheetDescription>
          </SheetHeader>
          <Sidebar
            className="h-full w-full border-r-0 shadow-none"
            onNavigate={() => setNavigationOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenNavigation={() => setNavigationOpen(true)} />
        <main className="responsive-bottom-safe flex-1 overflow-auto p-3 pb-20 sm:p-4 md:p-6 lg:pb-6">
          <div
            key={`${pathname}-${activeRole ?? 'role'}`}
            className="dc-view-in mx-auto w-full max-w-[1480px]"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
