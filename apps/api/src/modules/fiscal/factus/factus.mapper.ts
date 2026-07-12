import {
  CustomerDocumentType,
  PaymentMethod,
  type CreditNote,
  type CreditNoteLine,
  type Customer,
  type FiscalProfile,
  type Invoice,
  type InvoiceLine,
  type InvoiceTax,
  type Payment,
  type Sale,
} from '../../../../generated/prisma';
import type { FiscalNumberingRangeDto } from '@gastroai/contracts';
import type {
  FactusAllowanceChargePayload,
  FactusBillPayload,
  FactusBillStatus,
  FactusCreditNotePayload,
  FactusCustomerPayload,
  FactusItemPayload,
  FactusPaymentDetail,
  FactusTaxPayload,
} from './factus.types';

const CONSUMER_FINAL_DOCUMENT = '222222222222';
const CONSUMER_FINAL_NAME = 'Consumidor Final';
const COLOMBIA_COUNTRY_CODE = 'CO';
const FACTUS_TAX_CODES = new Set(['01', '04', '35']);

export type FactusInvoiceRecord = Invoice & {
  fiscalProfile: FiscalProfile | null;
  customer: Customer | null;
  sale:
    | (Sale & {
        payments: Payment[];
      })
    | null;
  lines: InvoiceLine[];
  taxes: InvoiceTax[];
};

export type FactusCreditNoteRecord = CreditNote & {
  originalInvoice: FactusInvoiceRecord;
  lines: CreditNoteLine[];
};

export function buildFactusBillPayload(invoice: FactusInvoiceRecord): FactusBillPayload {
  assertInvoiceCanBeMapped(invoice);

  const numberingRangeId = invoice.numberingRangeId ?? invoice.fiscalProfile?.numberingRangeId;
  if (!numberingRangeId) {
    throw new Error('Factus numbering_range_id is required before issuing an invoice.');
  }

  const referenceCode = invoice.referenceCode ?? buildReferenceCode(invoice);
  const paymentDetails = buildPaymentDetails(invoice);
  const allowanceCharges = buildAllowanceCharges(invoice);

  return {
    reference_code: referenceCode,
    document: '01',
    numbering_range_id: numberingRangeId,
    operation_type: '10',
    send_email: false,
    payment_details: paymentDetails,
    cash_rounding_amount:
      invoice.sale && invoice.sale.roundingAmount !== 0
        ? money(invoice.sale.roundingAmount)
        : undefined,
    customer: buildCustomerPayload(invoice),
    items: invoice.lines.map((line) => buildItemPayload(line, invoice.taxes)),
    allowance_charges: allowanceCharges.length > 0 ? allowanceCharges : undefined,
  };
}

export function buildFactusCreditNotePayload(
  creditNote: FactusCreditNoteRecord,
): FactusCreditNotePayload {
  const invoice = creditNote.originalInvoice;
  if (!creditNote.numberingRangeId) {
    throw new Error('Credit note numbering range is required before issuing.');
  }
  if (creditNote.amount <= 0 || creditNote.lines.length === 0) {
    throw new Error('Credit note must contain at least one positive line.');
  }
  if (!invoice.factusId && !invoice.factusNumber) {
    throw new Error('Factus invoice reference is required before issuing a credit note.');
  }

  const payload: FactusCreditNotePayload = {
    reference_code: creditNote.referenceCode,
    correction_concept_code: creditNote.correctionConceptCode,
    customization_id: '20',
    numbering_range_id: creditNote.numberingRangeId,
    observation: optional(creditNote.observation),
    payment_details: buildCreditNotePaymentDetails(invoice, creditNote.amount),
    cash_rounding_amount: '0.00',
    customer: buildCustomerPayload(invoice),
    items: creditNote.lines.map((line) => buildCreditNoteItemPayload(line, invoice.taxes)),
    allowance_charges:
      creditNote.tipAmount > 0
        ? [
            {
              concept_type: '03',
              is_surcharge: true,
              reason: 'propina',
              base_amount: money(creditNote.subtotalAmount + creditNote.taxAmount),
              amount: money(creditNote.tipAmount),
            },
          ]
        : undefined,
  };

  const factusId = invoice.factusId?.trim();
  if (factusId && /^\d+$/.test(factusId)) {
    payload.bill_id = Number(factusId);
  } else if (invoice.factusNumber) {
    // Factus' V2 example and collection show bill_number while the field
    // reference describes bill_id. Prefer bill_id when it is available.
    payload.bill_number = invoice.factusNumber;
  }

  return payload;
}

export function buildReferenceCode(invoice: Pick<Invoice, 'tenantId' | 'saleId' | 'id'>): string {
  return invoice.saleId
    ? `sale:${invoice.tenantId}:${invoice.saleId}:v1`
    : `invoice:${invoice.tenantId}:${invoice.id}:v1`;
}

export function parseFactusBillStatus(payload: unknown): FactusBillStatus {
  const root = asRecord(payload);
  const data = asOptionalRecord(root.data) ?? root;
  const bill = asOptionalRecord(data.bill) ?? asOptionalRecord(data.invoice) ?? data;
  const links = asOptionalRecord(bill.links) ?? asOptionalRecord(data.links) ?? {};
  const status = readString(root.status) ?? readString(data.status) ?? readString(bill.status);
  const normalizedStatus = status?.toLowerCase();
  const isValidated =
    readBoolean(bill.is_validated) ??
    readBoolean(data.is_validated) ??
    readBoolean(root.is_validated) ??
    false;
  const errors = root.errors ?? data.errors ?? bill.errors ?? null;
  const isAccepted = Boolean(
    isValidated && normalizedStatus !== 'rejected' && normalizedStatus !== 'failed',
  );
  const isRejected = !isAccepted && hasRejectionError(errors);

  return {
    isAccepted,
    isRejected,
    isValidated,
    status,
    factusId: readString(bill.id) ?? readString(data.id),
    number:
      readString(bill.number) ??
      readString(data.number) ??
      readString(bill.bill_number) ??
      readString(data.bill_number),
    cufe: readString(bill.cufe) ?? readString(data.cufe),
    cude: readString(bill.cude) ?? readString(data.cude),
    qrUrl:
      readString(bill.qr) ??
      readString(bill.qr_url) ??
      readString(data.qr) ??
      readString(data.qr_url) ??
      readString(links.qr) ??
      readString(links.qr_url),
    publicUrl:
      readString(bill.public_url) ??
      readString(data.public_url) ??
      readString(bill.url) ??
      readString(data.url) ??
      readString(links.public_url) ??
      readString(links.url),
    validatedAt: parseDate(readString(bill.validated_at) ?? readString(data.validated_at)),
    errors,
  };
}

export function extractFactusArtifact(
  payload: unknown,
  base64Keys: string[],
): {
  fileName: string | null;
  base64: string | null;
} {
  const root = asRecord(payload);
  const data = asRecord(root.data) ?? root;
  const fileName =
    readString(data.file_name) ??
    readString(data.filename) ??
    readString(data.name) ??
    readString(root.file_name);

  for (const key of base64Keys) {
    const value = readString(data[key]) ?? readString(root[key]);
    if (value) {
      return { fileName, base64: value };
    }
  }

  return { fileName, base64: null };
}

/**
 * Factus documents its range endpoint, but the response envelope can differ
 * between list and DIAN-associated-range calls. Normalize known field aliases
 * at this provider boundary so the rest of GastroAI uses one stable shape.
 */
export function parseFactusNumberingRanges(payload: unknown): FiscalNumberingRangeDto[] {
  const records = extractRangeRecords(payload);
  const seen = new Set<number>();

  return records.flatMap((record) => {
    const id = readNumber(record.id) ?? readNumber(record.numbering_range_id);
    if (!id || seen.has(id)) {
      return [];
    }
    seen.add(id);

    return [
      {
        id,
        document:
          readString(record.document) ??
          readString(record.document_type) ??
          readString(record.document_code),
        prefix: readString(record.prefix),
        resolutionNumber: readString(record.resolution_number) ?? readString(record.resolution),
        rangeFrom:
          readNumber(record.from) ??
          readNumber(record.range_from) ??
          readNumber(record.from_number) ??
          readNumber(record.start_number),
        rangeTo:
          readNumber(record.to) ??
          readNumber(record.range_to) ??
          readNumber(record.to_number) ??
          readNumber(record.end_number),
        current:
          readNumber(record.current) ??
          readNumber(record.current_number) ??
          readNumber(record.next_number),
        validFrom: dateToIso(
          readString(record.valid_from) ??
            readString(record.start_date) ??
            readString(record.date_from),
        ),
        validUntil: dateToIso(
          readString(record.valid_until) ??
            readString(record.end_date) ??
            readString(record.date_to) ??
            readString(record.expiration_date),
        ),
        isActive: readRangeActive(record),
      },
    ];
  });
}

function assertInvoiceCanBeMapped(invoice: FactusInvoiceRecord): void {
  if (!invoice.fiscalProfile?.isReady) {
    throw new Error('Fiscal profile is required before issuing invoices.');
  }
  if (invoice.totalAmount <= 0) {
    throw new Error('Invoice total must be greater than zero.');
  }
  if (invoice.lines.length === 0) {
    throw new Error('Invoice must have at least one item.');
  }
  for (const line of invoice.lines) {
    assertLineCanBeMapped(line);
  }
  const paymentsTotal =
    invoice.sale?.payments.reduce((total, payment) => total + payment.amount, 0) ?? 0;
  if (
    paymentsTotal > 0 &&
    paymentsTotal !== invoice.totalAmount + (invoice.sale?.roundingAmount ?? 0)
  ) {
    throw new Error('Payment total must match the fiscal invoice total.');
  }
}

function buildPaymentDetails(invoice: FactusInvoiceRecord): FactusPaymentDetail[] {
  const payments = invoice.sale?.payments ?? [];
  if (payments.length === 0) {
    return [
      {
        payment_form: '2',
        payment_method_code: 'ZZZ',
        amount: money(invoice.totalAmount),
        due_date: ymd(new Date()),
      },
    ];
  }

  return payments.map((payment) => {
    const paymentForm = payment.paymentForm || (payment.dueDate ? 2 : 1);
    return {
      payment_form: String(paymentForm),
      payment_method_code: payment.factusPaymentMethodCode ?? mapPaymentMethod(payment.method),
      reference_code: payment.reference ?? payment.acquirerReference ?? payment.id,
      amount: money(payment.amount),
      due_date: paymentForm === 2 ? ymd(payment.dueDate ?? new Date()) : undefined,
    };
  });
}

function buildCreditNotePaymentDetails(
  invoice: FactusInvoiceRecord,
  creditNoteAmount: number,
): FactusPaymentDetail[] {
  const payments = invoice.sale?.payments.filter((payment) => payment.amount > 0) ?? [];
  if (payments.length === 0) {
    return [
      {
        payment_form: '1',
        payment_method_code: 'ZZZ',
        amount: money(creditNoteAmount),
      },
    ];
  }

  const totalPaid = payments.reduce((total, payment) => total + payment.amount, 0);
  let remaining = creditNoteAmount;
  return payments.map((payment, index) => {
    const amount =
      index === payments.length - 1
        ? remaining
        : Math.min(remaining, Math.round((creditNoteAmount * payment.amount) / totalPaid));
    remaining -= amount;
    const paymentForm = payment.paymentForm || (payment.dueDate ? 2 : 1);
    return {
      payment_form: String(paymentForm),
      payment_method_code: payment.factusPaymentMethodCode ?? mapPaymentMethod(payment.method),
      reference_code: payment.reference ?? payment.acquirerReference ?? payment.id,
      amount: money(amount),
      due_date: paymentForm === 2 ? ymd(payment.dueDate ?? new Date()) : undefined,
    };
  });
}

function buildCustomerPayload(invoice: FactusInvoiceRecord): FactusCustomerPayload {
  const documentNumber = invoice.customerDocumentNumber?.trim();
  if (!documentNumber || documentNumber === CONSUMER_FINAL_DOCUMENT) {
    return {
      identification_document_code: '13',
      identification: CONSUMER_FINAL_DOCUMENT,
      legal_organization_code: '2',
      tribute_code: 'ZZ',
      names: CONSUMER_FINAL_NAME,
      country_code: COLOMBIA_COUNTRY_CODE,
    };
  }

  const documentType = normalizeDocumentType(
    invoice.customer?.documentType,
    invoice.customerDocumentType,
  );
  const documentParts = splitNit(
    documentType,
    documentNumber,
    invoice.customerDv ?? invoice.customer?.dv ?? null,
  );
  const legalOrganizationCode =
    invoice.customerLegalOrganizationCode ??
    invoice.customer?.legalOrganizationCode ??
    (documentType === CustomerDocumentType.NIT ? '1' : '2');
  const name = invoice.customerName.trim();
  const payload: FactusCustomerPayload = {
    identification_document_code:
      invoice.customerIdentificationCode ??
      invoice.customer?.factusIdentificationCode ??
      mapDocumentType(documentType),
    identification: documentParts.identification,
    dv: documentParts.dv ?? undefined,
    legal_organization_code: legalOrganizationCode,
    tribute_code: invoice.customerTributeCode ?? invoice.customer?.tributeCode ?? 'ZZ',
    address: optional(invoice.customerAddress ?? invoice.customer?.address),
    email: optional(invoice.customerEmail ?? invoice.customer?.email),
    phone: optional(invoice.customerPhone ?? invoice.customer?.phone),
    country_code:
      invoice.customerCountryCode ?? invoice.customer?.countryCode ?? COLOMBIA_COUNTRY_CODE,
    municipality_code: onlyMunicipalityCode(
      (invoice.customerCountryCode ?? invoice.customer?.countryCode ?? COLOMBIA_COUNTRY_CODE) ===
        COLOMBIA_COUNTRY_CODE
        ? (invoice.customerMunicipalityCode ??
            invoice.customer?.municipalityCode ??
            invoice.customerMunicipality ??
            invoice.customer?.municipality)
        : null,
    ),
  };

  if (legalOrganizationCode === '1') {
    payload.company = invoice.customerCompany ?? invoice.customer?.company ?? name;
    payload.trade_name = invoice.customerCompany ?? invoice.customer?.company ?? undefined;
  } else {
    payload.names = invoice.customerNames ?? invoice.customer?.names ?? name;
  }

  return payload;
}

function buildItemPayload(line: InvoiceLine, invoiceTaxes: InvoiceTax[]): FactusItemPayload {
  const discountAmount =
    line.factusDiscountAmount ?? (line.discountAmount > 0 ? money(line.discountAmount) : undefined);

  return {
    code_reference: line.codeReference ?? line.productId ?? line.id,
    name: line.description,
    quantity: quantity(line.quantity),
    discount_amount: discountAmount,
    price: line.factusPrice ?? money(line.unitPriceAmount),
    unit_measure_code: line.unitMeasureCode,
    standard_code: line.standardCode,
    taxes: buildLineTaxes(line, invoiceTaxes),
  };
}

function buildCreditNoteItemPayload(
  line: CreditNoteLine,
  invoiceTaxes: InvoiceTax[],
): FactusItemPayload {
  const discountAmount =
    line.factusDiscountAmount ?? (line.discountAmount > 0 ? money(line.discountAmount) : undefined);

  return {
    code_reference: line.codeReference ?? line.originalInvoiceLineId ?? line.id,
    name: line.description,
    quantity: quantity(line.quantity),
    discount_amount: discountAmount,
    price: line.factusPrice ?? money(line.unitPriceAmount),
    unit_measure_code: line.unitMeasureCode,
    standard_code: line.standardCode,
    taxes: buildCreditNoteLineTaxes(line, invoiceTaxes),
  };
}

function buildLineTaxes(line: InvoiceLine, invoiceTaxes: InvoiceTax[]): FactusTaxPayload[] {
  if (line.isTaxExcluded) {
    return [{ code: line.factusTaxCode, rate: '0.00', is_excluded: true }];
  }

  const taxRate =
    line.taxRateBasisPoints > 0
      ? line.taxRateBasisPoints
      : (invoiceTaxes.find((tax) => tax.taxAmount > 0 && tax.factusTaxCode === line.factusTaxCode)
          ?.taxRateBasisPoints ?? 0);
  return [{ code: line.factusTaxCode, rate: rate(taxRate) }];
}

function buildCreditNoteLineTaxes(
  line: CreditNoteLine,
  invoiceTaxes: InvoiceTax[],
): FactusTaxPayload[] {
  if (line.isTaxExcluded) {
    return [{ code: line.factusTaxCode, rate: '0.00', is_excluded: true }];
  }

  const taxRate =
    line.taxRateBasisPoints > 0
      ? line.taxRateBasisPoints
      : (invoiceTaxes.find((tax) => tax.taxAmount > 0 && tax.factusTaxCode === line.factusTaxCode)
          ?.taxRateBasisPoints ?? 0);
  return [{ code: line.factusTaxCode, rate: rate(taxRate) }];
}

function buildAllowanceCharges(invoice: FactusInvoiceRecord): FactusAllowanceChargePayload[] {
  const tipAmount = invoice.sale?.tipAmount ?? 0;
  if (tipAmount <= 0) {
    return [];
  }

  return [
    {
      concept_type: '03',
      is_surcharge: true,
      reason: 'propina',
      base_amount: money(invoice.subtotalAmount),
      amount: money(tipAmount),
    },
  ];
}

function normalizeDocumentType(
  customerType: CustomerDocumentType | undefined,
  snapshotType: string | null,
): CustomerDocumentType {
  if (customerType) {
    return customerType;
  }
  if (snapshotType && snapshotType in CustomerDocumentType) {
    return CustomerDocumentType[snapshotType as keyof typeof CustomerDocumentType];
  }
  return CustomerDocumentType.CC;
}

function mapDocumentType(type: CustomerDocumentType): string {
  const map: Record<CustomerDocumentType, string> = {
    [CustomerDocumentType.CC]: '13',
    [CustomerDocumentType.NIT]: '31',
    [CustomerDocumentType.CE]: '22',
    [CustomerDocumentType.PP]: '41',
    [CustomerDocumentType.TI]: '12',
    [CustomerDocumentType.NUIP]: '91',
    [CustomerDocumentType.OTHER]: '13',
  };
  return map[type];
}

function mapPaymentMethod(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: '10',
    [PaymentMethod.CARD]: '49',
    [PaymentMethod.TRANSFER]: '47',
    [PaymentMethod.OTHER]: 'ZZZ',
  };
  return map[method];
}

function assertLineCanBeMapped(line: InvoiceLine): void {
  if (!FACTUS_TAX_CODES.has(line.factusTaxCode)) {
    throw new Error(`Unsupported Factus tax code "${line.factusTaxCode}" for line ${line.id}.`);
  }
  if (line.taxRateBasisPoints < 0) {
    throw new Error(`Tax rate cannot be negative for line ${line.id}.`);
  }
  if (line.isTaxExcluded && line.taxAmount > 0) {
    throw new Error(`Excluded line ${line.id} cannot include tax amount.`);
  }
  if (line.taxRateBasisPoints > 0 && !line.factusPrice) {
    throw new Error(`Taxed line ${line.id} must include a net Factus unit price.`);
  }
  assertFactusAmount(line.factusPrice ?? money(line.unitPriceAmount), `price for line ${line.id}`);
  if (line.factusDiscountAmount) {
    assertFactusAmount(line.factusDiscountAmount, `discount for line ${line.id}`);
  }
}

function assertFactusAmount(value: string, label: string): void {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error(`Invalid Factus ${label}: expected a number with max two decimals.`);
  }
}

function splitNit(
  type: CustomerDocumentType,
  documentNumber: string,
  explicitDv: string | null,
): { identification: string; dv: string | null } {
  if (type !== CustomerDocumentType.NIT) {
    return { identification: documentNumber.replace(/\D/g, ''), dv: null };
  }
  const cleaned = documentNumber.trim();
  if (cleaned.includes('-')) {
    const [identification, dv] = cleaned.split('-');
    return {
      identification: identification.replace(/\D/g, ''),
      dv: explicitDv ?? dv?.replace(/\D/g, '') ?? null,
    };
  }
  return { identification: cleaned.replace(/\D/g, ''), dv: explicitDv };
}

function money(value: number): string {
  return `${value}.00`;
}

function quantity(value: number): string {
  return `${value.toFixed(2)}`;
}

function rate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2);
}

function ymd(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function optional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function onlyMunicipalityCode(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /^\d{5}$/.test(trimmed) ? trimmed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOptionalRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractRangeRecords(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const data = asOptionalRecord(root.data);
  const candidates: unknown[] = [
    root.data,
    root.items,
    root.numbering_ranges,
    root.ranges,
    data?.data,
    data?.items,
    data?.numbering_ranges,
    data?.ranges,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> =>
        Boolean(asOptionalRecord(item)),
      );
    }
  }

  return [];
}

function readString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value);
  }
  return null;
}

function readRangeActive(record: Record<string, unknown>): boolean | null {
  const explicit = readBoolean(record.is_active) ?? readBoolean(record.active);
  if (explicit !== null) {
    return explicit;
  }
  const status = readString(record.status)?.trim().toLowerCase();
  if (!status) {
    return null;
  }
  if (['active', 'activo', 'enabled', 'habilitado'].includes(status)) {
    return true;
  }
  if (['inactive', 'inactivo', 'disabled', 'deshabilitado'].includes(status)) {
    return false;
  }
  return null;
}

function dateToIso(value: string | null): string | null {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const dianDate = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([AP]M)$/i.exec(value);
  if (dianDate) {
    const [, day, month, year, hour, minute, second, meridiem] = dianDate;
    const hourNumber = Number(hour);
    const normalizedHour =
      meridiem.toUpperCase() === 'PM'
        ? hourNumber === 12
          ? 12
          : hourNumber + 12
        : hourNumber === 12
          ? 0
          : hourNumber;

    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        normalizedHour,
        Number(minute),
        Number(second),
      ),
    );
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasRejectionError(errors: unknown): boolean {
  if (errors === null || errors === undefined) {
    return false;
  }
  if (typeof errors === 'string') {
    return errors.toLowerCase().includes('rechazo');
  }
  if (Array.isArray(errors)) {
    return errors.some((error) => hasRejectionError(error));
  }
  if (typeof errors === 'object') {
    return Object.values(errors as Record<string, unknown>).some((value) =>
      hasRejectionError(value),
    );
  }
  return false;
}
