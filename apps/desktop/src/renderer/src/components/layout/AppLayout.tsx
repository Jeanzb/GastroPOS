import { Outlet, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/stores';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const activeRole = useAuthStore((state) => state.activeRole);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="operational-surface flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div key={`${pathname}-${activeRole ?? 'role'}`} className="dc-view-in mx-auto w-full max-w-[1480px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
