export const BASIC_PLAN_PRICE_AMOUNT = 99000;
export const BASIC_PLAN_CURRENCY = 'COP';

const FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  'cash.enabled': {
    label: 'Caja',
    description: 'Apertura, movimientos, cierre y Reporte Z.',
  },
  'dian.enabled': {
    label: 'Facturacion electronica',
    description: 'Preparacion fiscal y borradores para DIAN.',
  },
  'employees.enabled': {
    label: 'Empleados',
    description: 'Usuarios, roles y acceso POS.',
  },
  'inventory.enabled': {
    label: 'Inventario',
    description: 'Insumos, saldos por sede y Kardex.',
  },
  'multi_branch.enabled': {
    label: 'Multi-sede',
    description: 'Operacion separada por sedes.',
  },
  'pos.enabled': {
    label: 'POS',
    description: 'Ventas, mesas, comandas y recibos.',
  },
  'purchases.enabled': {
    label: 'Compras',
    description: 'Proveedores, compras y recepcion de stock.',
  },
  'reports.basic': {
    label: 'Reportes basicos',
    description: 'Ventas, pagos y productos principales.',
  },
  'reports.advanced': {
    label: 'Reportes avanzados',
    description: 'Analitica ampliada para control operativo.',
  },
  'tables.enabled': {
    label: 'Mesas',
    description: 'Salon, zonas, cuentas y estados de mesa.',
  },
};

export function featureLabel(code: string): string {
  return FEATURE_LABELS[code]?.label ?? humanizeFeatureCode(code);
}

export function featureDescription(code: string, fallback?: string | null): string {
  return FEATURE_LABELS[code]?.description ?? fallback ?? 'Modulo operativo de GastroAI.';
}

function humanizeFeatureCode(code: string): string {
  return code
    .replace(/\.enabled$/, '')
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
