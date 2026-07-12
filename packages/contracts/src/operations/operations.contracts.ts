export type DiningTableStatus = 'FREE' | 'OCCUPIED' | 'PENDING_BILL' | 'RESERVED';

export interface DiningTableDto {
  id: string;
  zoneId: string;
  branchId: string;
  number: string;
  seats: number;
  status: DiningTableStatus;
  waiterName?: string | null;
  openedAt?: string | null;
  reservationName?: string | null;
  reservationTime?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiningZoneDto {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  tables: DiningTableDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiningZoneRequest {
  name: string;
  sortOrder?: number;
}

export interface UpdateDiningZoneRequest {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateDiningTableRequest {
  number: string;
  seats: number;
}

export interface UpdateDiningTableRequest {
  number?: string;
  seats?: number;
  zoneId?: string;
}

export interface UpdateDiningTableStatusRequest {
  status: DiningTableStatus;
  waiterName?: string | null;
  reservationName?: string | null;
  reservationTime?: string | null;
  notes?: string | null;
}

export type TableAccountStatus = 'DRAFT' | 'CLOSED' | 'CANCELLED';

export type TablePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export type FiscalCustomerDocumentType = 'CC' | 'NIT' | 'CE' | 'PP' | 'TI' | 'NUIP' | 'OTHER';

export type FiscalInvoiceDraftStatus =
  | 'DRAFT'
  | 'READY_TO_SEND'
  | 'PENDING_VALIDATION'
  | 'SENT_TO_PROVIDER'
  | 'SENT'
  | 'ACCEPTED_BY_DIAN'
  | 'ACCEPTED'
  | 'REJECTED_BY_DIAN'
  | 'REJECTED'
  | 'CANCELLED_BEFORE_ISSUE'
  | 'CANCELLED'
  | 'CORRECTED_WITH_CREDIT_NOTE'
  | 'PARTIALLY_REFUNDED'
  | 'FULLY_REFUNDED'
  | 'FAILED';

export interface TableAccountItemDto {
  id: string;
  productId?: string | null;
  name: string;
  unitPriceAmount: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
}

export interface TableAccountPaymentDto {
  id: string;
  method: TablePaymentMethod;
  amount: number;
  reference?: string | null;
  createdAt: string;
}

export interface TableAccountInvoiceDto {
  id: string;
  status: FiscalInvoiceDraftStatus;
  customerName: string;
  totalAmount: number;
  createdAt: string;
}

export interface TableAccountDto {
  id: string;
  diningTableId: string;
  tableNumber: string;
  branchId: string;
  status: TableAccountStatus;
  currency: string;
  waiterName?: string | null;
  guestCount?: number | null;
  customerName?: string | null;
  requiresInvoice: boolean;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidTotal: number;
  balanceDue: number;
  items: TableAccountItemDto[];
  payments: TableAccountPaymentDto[];
  invoice?: TableAccountInvoiceDto | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface OpenTableAccountRequest {
  waiterName?: string;
  guestCount?: number;
  customerName?: string;
}

export interface AddTableAccountItemRequest {
  productId: string;
  quantity?: number;
}

export interface UpdateTableAccountItemRequest {
  quantity: number;
}

export interface FiscalCustomerInput {
  documentType: FiscalCustomerDocumentType;
  documentNumber: string;
  dv?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  municipality?: string;
  municipalityCode?: string;
  countryCode?: string;
  taxResponsibility?: string;
}

export interface ChargeTableAccountRequest {
  method: TablePaymentMethod;
  amount?: number;
  reference?: string;
  factusPaymentMethodCode?: string;
  requiresInvoice: boolean;
  customer?: FiscalCustomerInput;
  payments?: Array<{
    method: TablePaymentMethod;
    amount: number;
    reference?: string;
    factusPaymentMethodCode?: string;
    paymentForm?: 1 | 2;
    dueDate?: string;
  }>;
}

export interface KitchenCommandItemDto {
  id: string;
  productId?: string | null;
  name: string;
  quantity: number;
}

export interface KitchenCommandDto {
  saleId: string;
  tableNumber: string;
  waiterName?: string | null;
  createdAt: string;
  items: KitchenCommandItemDto[];
  totalItems: number;
}

export interface ReceiptItemDto {
  id: string;
  name: string;
  unitPriceAmount: number;
  quantity: number;
  lineTotal: number;
}

export interface ReceiptDto {
  saleId: string;
  tableNumber: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidTotal: number;
  balanceDue: number;
  paymentMethod?: TablePaymentMethod | null;
  requiresInvoice: boolean;
  invoice?: TableAccountInvoiceDto | null;
  items: ReceiptItemDto[];
  closedAt?: string | null;
}
