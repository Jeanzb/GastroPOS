import { Link } from '@tanstack/react-router';
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
} from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/brand';
import { StatusPill } from '@/components/operations';
import { NAVIGATION_ITEMS } from '@/constants';
import { cn } from '@/lib/utils';
import type { NavigationIconMap, NavigationItem, NavigationSection } from '@/types/operations';

const NAVIGATION_ICON_MAP: NavigationIconMap = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  products: Package,
  cash: Calculator,
  inventory: Boxes,
  fiscal: FileText,
  reports: BarChart3,
  onboarding: ClipboardCheck,
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

function SidebarNavItem({ item }: { item: NavigationItem }) {
  const Icon = NAVIGATION_ICON_MAP[item.icon];

  return (
    <Link
      to={item.path}
      activeOptions={{ exact: item.path === '/' }}
      className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/68 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      activeProps={{
        className: 'bg-sidebar-accent text-sidebar-foreground shadow-sm',
      }}
    >
      <Icon className="h-4 w-4" />
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
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark className="h-9 w-9" />
        <div>
          <Wordmark className="text-xl" />
          <p className="mt-1 text-[11px] text-sidebar-foreground/46">Inteligencia operativa</p>
        </div>
      </div>

      <nav className="flex-1 space-y-7 px-3 py-2">
        <SidebarNavSection label="operation" items={OPERATION_ITEMS} />
        <SidebarNavSection label="administration" items={ADMINISTRATION_ITEMS} />
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs font-medium text-sidebar-foreground/70">GastroAI Core</p>
        <p className="mt-1 text-[11px] text-sidebar-foreground/38">Desktop MVP v0.1.0</p>
      </div>
    </aside>
  );
}
