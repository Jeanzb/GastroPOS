import type { ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { Building2, LayoutDashboard, LogOut, ShieldCheck, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatformAuth } from '@/hooks/platform';
import { usePlatformAuthStore } from '@/stores';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/platform', label: 'Overview', icon: LayoutDashboard },
  { to: '/platform/tenants', label: 'Restaurantes', icon: Building2 },
  { to: '/platform/plans', label: 'Plan BASIC', icon: Tags },
] as const;

interface PlatformShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function PlatformShell({ title, description, children }: PlatformShellProps) {
  const router = useRouter();
  const user = usePlatformAuthStore((state) => state.user);
  const clear = usePlatformAuthStore((state) => state.clear);
  const { logoutMutation } = usePlatformAuth();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Local logout still wins if the server session is already gone.
    } finally {
      clear();
      void router.navigate({ to: '/platform/login' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-carbon">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-carbon/10 bg-[#171410] p-5 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white text-sm font-bold text-orange">
            G
          </div>
          <div>
            <p className="font-display text-lg font-semibold">GastroAI</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Platform</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white',
                '[&.active]:bg-orange/18 [&.active]:text-white',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-white/10 text-xs font-bold">
              {user?.fullName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2) ?? 'PA'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.fullName ?? 'Platform admin'}</p>
              <p className="truncate text-xs text-white/48">{user?.email}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/12 bg-transparent text-white hover:bg-white/8 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Cerrar sesion
          </Button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-carbon/10 bg-[#f5f0e8]/92 px-6 py-5 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-carbon/45">
                <ShieldCheck className="size-4 text-orange" />
                Administracion SaaS
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-carbon/58">{description}</p>
            </div>
          </div>
        </header>
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
