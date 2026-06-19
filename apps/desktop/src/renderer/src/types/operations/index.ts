import type { LucideIcon } from 'lucide-react';
import type { AppPermission } from '@/types/auth';

export type TrendDirection = 'up' | 'down' | 'neutral';

export type NavigationSection = 'operation' | 'administration';

export type NavigationIcon =
  | 'dashboard'
  | 'tables'
  | 'pos'
  | 'products'
  | 'cash'
  | 'inventory'
  | 'customers'
  | 'purchases'
  | 'employees'
  | 'fiscal'
  | 'reports'
  | 'onboarding'
  | 'floor';

export interface NavigationItem {
  label: string;
  path: string;
  section: NavigationSection;
  icon: NavigationIcon;
  requiredPermission?: AppPermission;
  badge?: string;
  badgeTone?: 'orange' | 'green';
}

export interface MetricSummary {
  label: string;
  value: string;
  trend: string;
  direction: TrendDirection;
}

export interface HourlySalesPoint {
  label: string;
  value: number;
  intensity: 'low' | 'medium' | 'high';
}

export interface CashRegisterSummary {
  amount: string;
  base: string;
  openedAt: string;
  cashier: string;
  status: string;
}

export interface FiscalSummary {
  emitted: number;
  queued: number;
  rejected: number;
}

export interface TopProduct {
  name: string;
  quantity: string;
}

export interface BranchOption {
  initials: string;
  name: string;
  address: string;
  tables: string;
  cashStatus: string;
  serviceStatus: string;
  statusTone: 'green' | 'amber';
}

export interface PosCategory {
  name: string;
  count: number;
  active?: boolean;
}

export interface PosProduct {
  name: string;
  price: string;
  station: string;
  available: string;
}

export interface TicketLine {
  name: string;
  quantity: number;
  total: string;
}

export interface CashBreakdown {
  label: string;
  amount: string;
  detail: string;
}

export interface InventoryAlert {
  item: string;
  current: string;
  minimum: string;
  status: 'critical' | 'warning';
}

export interface FiscalQueueItem {
  document: string;
  customer: string;
  status: string;
  tone: 'green' | 'amber' | 'red';
}

export interface ReportMetric {
  label: string;
  value: string;
  detail: string;
}

export interface SetupStep {
  title: string;
  description: string;
  status: 'done' | 'current' | 'pending';
}

export type DiningTableStatus = 'free' | 'occupied' | 'pending_bill' | 'reserved';

export interface DiningTable {
  id: string;
  number: string;
  zone: string;
  seats: number;
  status: DiningTableStatus;
  waiter?: string;
  minutes?: number;
  total?: string;
  items?: number;
  reservationTime?: string;
  reservationName?: string;
}

export interface DiningZone {
  name: string;
  tables: DiningTable[];
}

export interface NavigationIconMap {
  dashboard: LucideIcon;
  tables: LucideIcon;
  pos: LucideIcon;
  products: LucideIcon;
  cash: LucideIcon;
  inventory: LucideIcon;
  customers: LucideIcon;
  purchases: LucideIcon;
  employees: LucideIcon;
  fiscal: LucideIcon;
  reports: LucideIcon;
  onboarding: LucideIcon;
  floor: LucideIcon;
}

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  status?: string;
}
