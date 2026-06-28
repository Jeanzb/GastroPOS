import type { NavigationItem, RouteMeta, SetupStep } from '@/types/operations';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    section: 'operation',
    icon: 'dashboard',
    requiredPermission: 'dashboard:view',
  },
  {
    label: 'Mesas',
    path: '/tables',
    section: 'operation',
    icon: 'tables',
    requiredPermission: 'tables:view',
  },
  {
    label: 'POS',
    path: '/pos',
    section: 'operation',
    icon: 'pos',
    requiredPermission: 'pos:view',
  },
  {
    label: 'Productos',
    path: '/catalog',
    section: 'operation',
    icon: 'products',
    requiredPermission: 'catalog:view',
  },
  {
    label: 'Caja',
    path: '/cash',
    section: 'operation',
    icon: 'cash',
    requiredPermission: 'cash:view',
  },
  {
    label: 'Inventario',
    path: '/inventory',
    section: 'operation',
    icon: 'inventory',
    requiredPermission: 'inventory:view',
  },
  {
    label: 'Clientes',
    path: '/customers',
    section: 'administration',
    icon: 'customers',
    requiredPermission: 'customers:view',
  },
  {
    label: 'Compras',
    path: '/purchases',
    section: 'administration',
    icon: 'purchases',
    requiredPermission: 'purchases:view',
  },
  {
    label: 'Empleados',
    path: '/employees',
    section: 'administration',
    icon: 'employees',
    requiredPermission: 'employees:view',
  },
  {
    label: 'Facturacion DIAN',
    path: '/fiscal',
    section: 'administration',
    icon: 'fiscal',
    requiredPermission: 'fiscal:view',
  },
  {
    label: 'Reportes',
    path: '/reports',
    section: 'administration',
    icon: 'reports',
    requiredPermission: 'reports:view',
  },
  {
    label: 'Puesta en marcha',
    path: '/onboarding',
    section: 'administration',
    icon: 'onboarding',
    requiredPermission: 'onboarding:view',
  },
  {
    label: 'Zonas y mesas',
    path: '/floor',
    section: 'administration',
    icon: 'floor',
    requiredPermission: 'tables:manage',
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
    path: '/tables',
    title: 'Mesas',
    description: 'Estado de salon, cuentas pendientes y facturacion por mesa',
    status: 'Salon activo',
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
    path: '/purchases',
    title: 'Compras',
    description: 'Proveedores, gastos y documentos por pagar',
    status: 'Control de costos',
  },
  {
    path: '/employees',
    title: 'Empleados',
    description: 'Roles, accesos y actividad del equipo',
    status: 'Accesos activos',
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
    path: '/floor',
    title: 'Zonas y mesas',
    description: 'Configuracion del mapa del restaurante',
    status: 'Admin',
  },
  {
    path: '/onboarding',
    title: 'Puesta en marcha',
    description: 'Checklist de configuracion inicial',
    status: 'Fase MVP',
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
