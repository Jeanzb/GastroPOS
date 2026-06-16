import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Building2, CalendarDays, ChevronDown, LogOut } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTE_META } from '@/constants';
import { useAuth } from '@/hooks/auth';
import { useAuthStore } from '@/stores';
import type { RouteMeta } from '@/types/operations';

const DEFAULT_ROUTE_META: RouteMeta = {
  path: '/',
  title: 'GastroAI',
  description: 'Operacion del restaurante',
  status: 'Activo',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

function getRouteMeta(pathname: string): RouteMeta {
  return ROUTE_META.find((meta) => meta.path === pathname) ?? DEFAULT_ROUTE_META;
}

export function Topbar() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const routeMeta = getRouteMeta(pathname);

  const onLogout = async () => {
    await logout();
    await navigate({ to: '/login' });
  };

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-card/95 px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="truncate font-display text-xl font-semibold tracking-tight">
            {routeMeta.title}
          </h1>
          {routeMeta.status ? <StatusPill tone="orange">{routeMeta.status}</StatusPill> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{routeMeta.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" asChild className="h-9 gap-2 bg-background">
          <Link to="/sede">
            <Building2 className="h-4 w-4 text-orange" />
            Sede Centro
          </Link>
        </Button>

        <div className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground lg:flex">
          <CalendarDays className="h-4 w-4" />
          <span className="capitalize">{DATE_FORMATTER.format(new Date())}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange/15 text-xs font-semibold text-orange">
                {user?.fullName?.charAt(0) ?? 'U'}
              </span>
              <span className="hidden max-w-36 truncate text-sm md:block">
                {user?.fullName ?? 'Usuario'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
