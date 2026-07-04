import { useState, type ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LogoMark } from '@/components/brand';
import { usePlatformAuth } from '@/hooks/platform';
import { usePlatformAuthStore } from '@/stores';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/platform', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/platform/tenants', label: 'Restaurantes', icon: Building2, exact: false },
  { to: '/platform/features', label: 'Modulos', icon: SlidersHorizontal, exact: false },
  { to: '/platform/plans', label: 'Plan Basico', icon: Tags, exact: false },
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
  const [navigationOpen, setNavigationOpen] = useState(false);

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

  const navigation = (onNavigate?: () => void) => (
    <nav className="platform-stagger mt-10 space-y-2">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className={cn(
            'motion-press flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white',
            '[&.active]:bg-orange/18 [&.active]:text-white [&.active]:shadow-[inset_3px_0_0_#ff5a2c]',
          )}
          onClick={onNavigate}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="platform-shell-bg min-h-screen text-carbon">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-carbon/10 bg-[#171410] p-5 text-white lg:flex lg:flex-col">
        <div className="platform-motion-in flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white">
            <LogoMark className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">GastroAI</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Platform</p>
          </div>
        </div>

        {navigation()}

        <div className="platform-motion-in mt-auto border-t border-white/10 pt-4">
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

      <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
        <SheetContent
          side="left"
          className="w-[286px] max-w-[86vw] border-white/10 bg-[#171410] p-5 text-white sm:max-w-[320px]"
          showCloseButton={false}
          data-cy="platform-mobile-nav"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de plataforma</SheetTitle>
            <SheetDescription>Navegacion del panel global de GastroIA.</SheetDescription>
          </SheetHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-white">
              <LogoMark className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">GastroAI</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Platform</p>
            </div>
          </div>
          {navigation(() => setNavigationOpen(false))}
          <Button
            type="button"
            variant="outline"
            className="mt-auto w-full min-h-11 border-white/12 bg-transparent text-white hover:bg-white/8 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Cerrar sesion
          </Button>
        </SheetContent>
      </Sheet>

      <main className="lg:pl-64">
        <header className="responsive-safe-area sticky top-0 z-10 border-b border-carbon/10 bg-[#f8f3eb]/88 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="touch-target shrink-0 lg:hidden"
              aria-label="Abrir navegacion de plataforma"
              onClick={() => setNavigationOpen(true)}
              data-cy="platform-mobile-nav-open"
            >
              <Menu className="size-5" />
            </Button>
            <div className="platform-motion-in min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-carbon/45">
                <ShieldCheck className="size-4 text-orange" />
                Administracion SaaS
              </div>
              <h1 className="mt-2 truncate font-display text-xl font-semibold sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 hidden text-sm text-carbon/58 sm:block">{description}</p>
            </div>
          </div>
        </header>
        <section className="platform-motion-in p-4 sm:p-6">{children}</section>
      </main>
    </div>
  );
}
