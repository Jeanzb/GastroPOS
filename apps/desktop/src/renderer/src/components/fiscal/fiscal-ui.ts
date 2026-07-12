import type { FiscalInvoiceStatus } from '@gastroai/contracts';

export type FiscalStatusTone = 'green' | 'amber' | 'red' | 'orange' | 'neutral';

export const FISCAL_DOCUMENT_STATUS_LABELS: Record<FiscalInvoiceStatus, string> = {
  DRAFT: 'Borrador',
  READY_TO_SEND: 'Listo para enviar',
  PENDING_VALIDATION: 'En cola DIAN',
  SENT_TO_PROVIDER: 'Enviado al proveedor',
  SENT: 'Enviado',
  ACCEPTED_BY_DIAN: 'Aceptado DIAN',
  ACCEPTED: 'Aceptado',
  REJECTED_BY_DIAN: 'Rechazado DIAN',
  REJECTED: 'Rechazado',
  CANCELLED_BEFORE_ISSUE: 'Cancelado antes de emitir',
  CANCELLED: 'Cancelado',
  CORRECTED_WITH_CREDIT_NOTE: 'Corregido con nota credito',
  PARTIALLY_REFUNDED: 'Devolucion parcial',
  FULLY_REFUNDED: 'Devolucion total',
  FAILED: 'Fallo tecnico',
};

export function fiscalDocumentStatusTone(status: FiscalInvoiceStatus): FiscalStatusTone {
  if (status === 'ACCEPTED_BY_DIAN' || status === 'ACCEPTED') {
    return 'green';
  }
  if (status === 'REJECTED_BY_DIAN' || status === 'REJECTED' || status === 'FAILED') {
    return 'red';
  }
  if (status === 'PENDING_VALIDATION' || status === 'SENT_TO_PROVIDER' || status === 'SENT') {
    return 'amber';
  }
  if (status === 'READY_TO_SEND') {
    return 'orange';
  }
  return 'neutral';
}

export function isFiscalDocumentRetriable(status: FiscalInvoiceStatus): boolean {
  return ![
    'ACCEPTED_BY_DIAN',
    'ACCEPTED',
    'PENDING_VALIDATION',
    'SENT_TO_PROVIDER',
    'SENT',
    'CANCELLED',
    'CANCELLED_BEFORE_ISSUE',
    'CORRECTED_WITH_CREDIT_NOTE',
    'PARTIALLY_REFUNDED',
    'FULLY_REFUNDED',
  ].includes(status);
}

export function isFiscalDocumentInFlight(status: FiscalInvoiceStatus): boolean {
  return ['PENDING_VALIDATION', 'SENT_TO_PROVIDER', 'SENT'].includes(status);
}
