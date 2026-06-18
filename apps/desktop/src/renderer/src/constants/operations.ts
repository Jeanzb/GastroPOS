import type {
  BranchOption,
  CashBreakdown,
  CashRegisterSummary,
  FiscalQueueItem,
  FiscalSummary,
  HourlySalesPoint,
  InventoryAlert,
  MetricSummary,
  NavigationItem,
  PosCategory,
  PosProduct,
  ReportMetric,
  RouteMeta,
  SetupStep,
  TicketLine,
  TopProduct,
} from '@/types/operations';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    section: 'operation',
    icon: 'dashboard',
  },
  {
    label: 'POS',
    path: '/pos',
    section: 'operation',
    icon: 'pos',
    badge: '5',
    badgeTone: 'orange',
  },
  {
    label: 'Productos',
    path: '/catalog',
    section: 'operation',
    icon: 'products',
  },
  {
    label: 'Caja',
    path: '/cash',
    section: 'operation',
    icon: 'cash',
    badge: 'Abierta',
    badgeTone: 'green',
  },
  {
    label: 'Inventario',
    path: '/inventory',
    section: 'operation',
    icon: 'inventory',
  },
  {
    label: 'Clientes',
    path: '/customers',
    section: 'administration',
    icon: 'customers',
  },
  {
    label: 'Facturacion DIAN',
    path: '/fiscal',
    section: 'administration',
    icon: 'fiscal',
  },
  {
    label: 'Reportes',
    path: '/reports',
    section: 'administration',
    icon: 'reports',
  },
  {
    label: 'Puesta en marcha',
    path: '/onboarding',
    section: 'administration',
    icon: 'onboarding',
  },
];

export const ROUTE_META: RouteMeta[] = [
  {
    path: '/',
    title: 'Dashboard',
    description: 'Resumen operativo de la sede actual',
    status: 'Operacion en vivo',
  },
  {
    path: '/pos',
    title: 'POS',
    description: 'Venta rapida, ticket y cierre de cuenta',
    status: 'Caja abierta',
  },
  {
    path: '/catalog',
    title: 'Productos',
    description: 'Categorias, precios y disponibilidad',
    status: 'Catalogo activo',
  },
  {
    path: '/cash',
    title: 'Caja',
    description: 'Sesion, movimientos y cierre de turno',
    status: 'Requiere cuadre',
  },
  {
    path: '/inventory',
    title: 'Inventario',
    description: 'Stock, alertas y movimientos Kardex',
    status: '3 alertas',
  },
  {
    path: '/customers',
    title: 'Clientes',
    description: 'Registro de clientes para facturacion electronica',
    status: 'Registro activo',
  },
  {
    path: '/fiscal',
    title: 'Facturacion DIAN',
    description: 'Preparacion fiscal y estado de documentos',
    status: 'Modo preparacion',
  },
  {
    path: '/reports',
    title: 'Reportes',
    description: 'Ventas, margen, caja e inventario',
    status: 'Datos del dia',
  },
  {
    path: '/onboarding',
    title: 'Puesta en marcha',
    description: 'Checklist de configuracion inicial',
    status: 'Fase MVP',
  },
];

export const DASHBOARD_METRICS: MetricSummary[] = [
  {
    label: 'Ventas de hoy',
    value: '$2.840.000',
    trend: '12% vs ayer',
    direction: 'up',
  },
  {
    label: 'Tickets cerrados',
    value: '64',
    trend: '8 mas',
    direction: 'up',
  },
  {
    label: 'Ticket promedio',
    value: '$44.400',
    trend: '3% vs ayer',
    direction: 'down',
  },
  {
    label: 'Margen bruto',
    value: '61%',
    trend: '2 pts',
    direction: 'up',
  },
];

export const HOURLY_SALES: HourlySalesPoint[] = [
  { label: '8a', value: 38, intensity: 'low' },
  { label: '9a', value: 60, intensity: 'low' },
  { label: '10a', value: 86, intensity: 'medium' },
  { label: '11a', value: 156, intensity: 'high' },
  { label: '12m', value: 178, intensity: 'high' },
  { label: '1p', value: 112, intensity: 'medium' },
  { label: '2p', value: 72, intensity: 'low' },
  { label: '3p', value: 64, intensity: 'low' },
  { label: '4p', value: 92, intensity: 'medium' },
  { label: '5p', value: 138, intensity: 'high' },
  { label: '6p', value: 104, intensity: 'medium' },
  { label: '8p', value: 54, intensity: 'low' },
];

export const CASH_REGISTER_SUMMARY: CashRegisterSummary = {
  amount: '$1.180.000',
  base: '$200.000',
  openedAt: '9:02 am',
  cashier: 'J. Gomez',
  status: 'Abierta',
};

export const FISCAL_SUMMARY: FiscalSummary = {
  emitted: 62,
  queued: 1,
  rejected: 0,
};

export const TOP_PRODUCTS: TopProduct[] = [
  { name: 'Bandeja paisa', quantity: 'x22' },
  { name: 'Limonada de coco', quantity: 'x19' },
  { name: 'Arepa de huevo', quantity: 'x14' },
];

export const BRANCH_OPTIONS: BranchOption[] = [
  {
    initials: 'SC',
    name: 'Sede Centro',
    address: 'Carrera 7 #18-24',
    tables: '18',
    cashStatus: 'Caja abierta',
    serviceStatus: 'Operando',
    statusTone: 'green',
  },
  {
    initials: 'ZN',
    name: 'Sede Norte',
    address: 'Calle 116 #19-10',
    tables: '14',
    cashStatus: 'Caja cerrada',
    serviceStatus: 'Lista',
    statusTone: 'amber',
  },
  {
    initials: 'DC',
    name: 'Domicilios',
    address: 'Canal virtual',
    tables: '0',
    cashStatus: 'Caja abierta',
    serviceStatus: 'Despacho',
    statusTone: 'green',
  },
];

export const POS_CATEGORIES: PosCategory[] = [
  { name: 'Todos', count: 42, active: true },
  { name: 'Almuerzos', count: 12 },
  { name: 'Bebidas', count: 14 },
  { name: 'Entradas', count: 8 },
  { name: 'Postres', count: 8 },
];

export const POS_PRODUCTS: PosProduct[] = [
  {
    name: 'Bandeja paisa',
    price: '$32.000',
    station: 'Cocina',
    available: 'Disponible',
  },
  {
    name: 'Limonada de coco',
    price: '$9.500',
    station: 'Barra',
    available: 'Disponible',
  },
  {
    name: 'Arepa de huevo',
    price: '$8.000',
    station: 'Cocina',
    available: 'Ultimas 6',
  },
  {
    name: 'Cafe campesino',
    price: '$5.500',
    station: 'Barra',
    available: 'Disponible',
  },
];

export const TICKET_LINES: TicketLine[] = [
  { name: 'Bandeja paisa', quantity: 2, total: '$64.000' },
  { name: 'Limonada de coco', quantity: 2, total: '$19.000' },
  { name: 'Arepa de huevo', quantity: 1, total: '$8.000' },
];

export const CASH_BREAKDOWN: CashBreakdown[] = [
  {
    label: 'Efectivo esperado',
    amount: '$980.000',
    detail: 'Base + ventas - retiros',
  },
  {
    label: 'Ventas en efectivo',
    amount: '$880.000',
    detail: '28 tickets',
  },
  {
    label: 'Tarjeta / datafono',
    amount: '$1.48M',
    detail: '26 tickets',
  },
  {
    label: 'Transferencia / QR',
    amount: '$480.000',
    detail: '10 tickets',
  },
];

export const INVENTORY_ALERTS: InventoryAlert[] = [
  {
    item: 'Carne molida',
    current: '4.2 kg',
    minimum: '8 kg',
    status: 'critical',
  },
  {
    item: 'Queso doble crema',
    current: '2.1 kg',
    minimum: '3 kg',
    status: 'warning',
  },
  {
    item: 'Limon tahiti',
    current: '36 und',
    minimum: '50 und',
    status: 'warning',
  },
];

export const FISCAL_QUEUE: FiscalQueueItem[] = [
  {
    document: 'FE-1282',
    customer: 'Consumidor final',
    status: 'Aceptada',
    tone: 'green',
  },
  {
    document: 'FE-1283',
    customer: 'Restaurante La Sazon SAS',
    status: 'En cola',
    tone: 'amber',
  },
  {
    document: 'FE-1279',
    customer: 'NIT 901234567',
    status: 'Revisar',
    tone: 'red',
  },
];

export const REPORT_METRICS: ReportMetric[] = [
  {
    label: 'Ventas netas',
    value: '$38.4M',
    detail: 'Semana actual',
  },
  {
    label: 'Costo estimado',
    value: '$14.9M',
    detail: 'Con recetas activas',
  },
  {
    label: 'Margen operativo',
    value: '61.2%',
    detail: 'Antes de gastos fijos',
  },
];

export const SETUP_STEPS: SetupStep[] = [
  {
    title: 'Crear tenant y sede',
    description: 'La operacion ya tiene sede Centro activa.',
    status: 'done',
  },
  {
    title: 'Configurar catalogo',
    description: 'Completa categorias, productos y precios.',
    status: 'current',
  },
  {
    title: 'Abrir caja piloto',
    description: 'Valida base, responsable y movimientos.',
    status: 'pending',
  },
  {
    title: 'Preparar facturacion',
    description: 'Carga resolucion, prefijo y proveedor fiscal.',
    status: 'pending',
  },
];
