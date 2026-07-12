import type { CreditNote, CreditNoteLine } from '../../../generated/prisma';
import type { FactusInvoiceRecord } from './factus/factus.mapper';

export type CreditNoteSourceInvoiceRecord = FactusInvoiceRecord & {
  creditNotes: Array<CreditNote & { lines: CreditNoteLine[] }>;
};

export type CreditNoteRecord = CreditNote & {
  lines: CreditNoteLine[];
};

export interface CreditNoteDraftLineData {
  originalInvoiceLineId: string;
  codeReference: string | null;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  grossUnitPriceAmount: number | null;
  factusPrice: string | null;
  discountAmount: number;
  factusDiscountAmount: string | null;
  taxableAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  unitMeasureCode: string;
  standardCode: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
}

export interface CreditNoteDraftData {
  referenceCode: string;
  correctionConceptCode: string;
  customizationId: '20';
  observation: string | null;
  numberingRangeId: number;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
  amount: number;
  currency: string;
  lines: CreditNoteDraftLineData[];
}
