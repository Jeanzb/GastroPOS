import { Link } from '@tanstack/react-router';
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  PanelTop,
  ReceiptText,
  ShoppingCart,
  SquareMenu,
  Users,
  UserCog,
} from 'lucide-react';
import { canRole, ROLE_LABELS } from '@gastroai/contracts';
import { LogoMark, Wordmark } from '@/components/brand';
import { StatusPill } from '@/components/operations';
import { NAVIGATION_ITEMS } from '@/constants';
import { useAuth } from '@/hooks/auth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { UserRole } from '@/types/auth';
import type { NavigationIconMap, NavigationItem, NavigationSection } from '@/types/operations';

const NAVIGATION_ICON_MAP: NavigationIconMap = {
  dashboard: LayoutDashboard,
  tables: SquareMenu,
  pos: ShoppingCart,
  products: Package,
  cash: Calculator,
  inventory: Boxes,
  customers: Users,
  purchases: ReceiptText,
  employees: UserCog,
  fiscal: FileText,
  reports: BarChart3,
  onboarding: ClipboardCheck,
  floor: PanelTop,
};

const SECTION_LABELS: Record<NavigationSection, string> = {
  operation: 'Operacion',
  administration: 'Administracion',
};

const OPERATION_ITEMS = NAVIGATION_ITEMS.filter(isOperationItem);
const ADMINISTRATION_ITEMS = NAVIGATION_ITEMS.filter(isAdministrationItem);

function isOperationItem(item: NavigationItem): boolean {
  return item.section === 'operation';
}

function isAdministrationItem(item: NavigationItem): boolean {
  return item.section === 'administration';
}

function getBadgeTone(item: NavigationItem): 'green' | 'orange' {
  return item.badgeTone === 'green' ? 'green' : 'orange';
}

function canSeeItem(role: UserRole | null, item: NavigationItem): boolean {
  if (!item.requiredPermission) {
    return true;
  }

  if (!role) {
    return false;
  }

  return canRole(role, item.requiredPermission);
}

function getInitials(name?: string): string {
  if (!name) {
    return 'UD';
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'UD';
}

function SidebarNavItem({ item }: { item: NavigationItem }) {
  const Icon = NAVIGATION_ICON_MAP[item.icon];

  return (
    <Link
      to={item.path}
      activeOptions={{ exact: item.path === '/' }}
      className="motion-press group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
      activeProps={{
        className: 'bg-sidebar-accent text-sidebar-foreground shadow-sm shadow-black/20',
      }}
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.04] text-sidebar-foreground/70 group-hover:bg-orange/15 group-hover:text-orange-soft">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <StatusPill
          tone={getBadgeTone(item)}
          className={cn(
            'h-5 border-white/10 px-1.5 text-[10px]',
            item.badgeTone === 'green'
              ? 'bg-emerald-400/12 text-emerald-200'
              : 'bg-orange/15 text-orange-soft',
          )}
        >
          {item.badge}
        </StatusPill>
      ) : null}
    </Link>
  );
}

function renderNavigationItem(item: NavigationItem) {
  return <SidebarNavItem key={item.path} item={item} />;
}

function SidebarNavSection({
  label,
  items,
}: {
  label: NavigationSection;
  items: NavigationItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/38">
        {SECTION_LABELS[label]}
      </p>
      <div className="space-y-1">{items.map(renderNavigationItem)}</div>
    </section>
  );
}

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const { logout, isLoggingOut } = useAuth();
  const visibleOperationItems = OPERATION_ITEMS.filter((item) => canSeeItem(activeRole, item));
  const visibleAdministrationItems = ADMINISTRATION_ITEMS.filter((item) =>
    canSeeItem(activeRole, item),
  );

  if (!user) {
    return null;
  }

  return (
    <aside className="flex w-[268px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl shadow-carbon/20">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <LogoMark variant="dark" className="h-10 w-12 shrink-0" />
        <Wordmark className="text-xl text-sidebar-foreground" />
      </div>

      <nav className="flex-1 space-y-7 px-3 py-2">
        <SidebarNavSection label="operation" items={visibleOperationItems} />
        <SidebarNavSection label="administration" items={visibleAdministrationItems} />
      </nav>

      <div className="mt-auto space-y-3 border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg p-1">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-xs font-bold text-orange-soft">
            {getInitials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/48">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isLoggingOut}
          data-cy="shift-close"
          className="motion-press flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange/90 text-sm font-bold text-white shadow-sm shadow-black/20 hover:bg-orange focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 disabled:opacity-60"
          title="Cierra tu turno y sesion"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? 'Cerrando turno...' : 'Cerrar Turno / Salir'}
        </button>
      </div>
    </aside>
  );
}
