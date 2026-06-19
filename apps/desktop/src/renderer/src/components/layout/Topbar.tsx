import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { getAvailableRoleProfilesForRole } from '@gastroai/contracts';
import { Button } from '@/components/ui/button';
import { ROUTE_META } from '@/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { RouteMeta } from '@/types/operations';
import type { RoleProfile, UserRole } from '@/types/auth';

const DEFAULT_ROUTE_META: RouteMeta = {
  path: '/',
  title: 'GastroIA',
  description: 'Operacion del restaurante',
  status: 'Activo',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
});

const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
  INVENTORY_MANAGER: 'Inventario',
  ACCOUNTANT: 'Contador',
};

function getRouteMeta(pathname: string): RouteMeta {
  return ROUTE_META.find((meta) => meta.path === pathname) ?? DEFAULT_ROUTE_META;
}

function formatDisplayDate(date: Date): string {
  const formatted = DATE_FORMATTER.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getRoleProfiles(userRole?: UserRole, availableRoles?: RoleProfile[]): RoleProfile[] {
  if (availableRoles?.length) {
    return availableRoles;
  }

  if (!userRole) {
    return [];
  }

  return getAvailableRoleProfilesForRole(userRole ?? 'ADMIN');
}

export function Topbar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [now, setNow] = useState(() => new Date());
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const routeMeta = getRouteMeta(pathname);
  const availableRoles = getRoleProfiles(user?.role, user?.availableRoles);
  const selectedRole = user ? (activeRole ?? availableRoles[0]?.role ?? user.role) : null;
  const rolesRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    const container = rolesRef.current;
    if (!container || !selectedRole) {
      setPill((current) => ({ ...current, ready: false }));
      return;
    }
    const active = container.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (active) {
      setPill({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
    }
  }, [selectedRole, availableRoles.length]);

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-background/95 px-7 shadow-sm shadow-carbon/5 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-normal text-foreground">
          {routeMeta.title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {user && availableRoles.length > 0 ? (
          <div
            ref={rolesRef}
            className="relative hidden items-center rounded-lg border border-border bg-surface-raised p-1 lg:flex"
          >
            {pill.ready ? (
              <span
                aria-hidden
                className="absolute top-1 bottom-1 left-0 rounded-md bg-carbon shadow-sm ease-[cubic-bezier(.34,1.38,.46,1)] [transition:transform_360ms,width_360ms] motion-reduce:transition-none"
                style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
              />
            ) : null}
            {availableRoles.map((profile) => (
              <button
                key={profile.role}
                type="button"
                data-active={selectedRole === profile.role}
                className={cn(
                  'relative z-10 h-7 rounded-md px-3 text-xs font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50',
                  selectedRole === profile.role
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setActiveRole(profile.role)}
              >
                {ROLE_SHORT_LABELS[profile.role]}
              </button>
            ))}
          </div>
        ) : null}

        <Button variant="outline" asChild className="h-9 gap-2 rounded-lg px-3">
          <Link to="/sede">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="hidden text-sm font-semibold md:inline">Sede El Poblado</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Link>
        </Button>

        <div className="hidden min-w-[96px] text-right lg:block">
          <p className="nums text-sm font-bold text-foreground">{TIME_FORMATTER.format(now)}</p>
          <p className="text-[11px] text-muted-foreground">{formatDisplayDate(now)}</p>
        </div>
      </div>
    </header>
  );
}
