import { Injectable } from '@nestjs/common';
import type { KitchenCommandDto, ReceiptDto, TableAccountDto } from '@gastroai/contracts';
import {
  CustomerDocumentType,
  PaymentMethod,
  SaleStatus,
  type Prisma,
  type TaxCategory,
} from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { computeNitVerificationDigit } from '../../common/fiscal/colombian-nit';
import { AuditService } from '../audit/audit.service';
import { FiscalService } from '../fiscal/fiscal.service';
import type { OperationsActor } from '../operations/operations.types';
import type { AddTableAccountItemDto } from './dto/add-table-account-item.dto';
import type {
  ChargeFiscalCustomerDto,
  ChargeTableAccountDto,
} from './dto/charge-table-account.dto';
import type { OpenTableAccountDto } from './dto/open-table-account.dto';
import type { UpdateTableAccountItemDto } from './dto/update-table-account-item.dto';
import { toKitchenCommandDto, toReceiptDto, toTableAccountDto } from './table-accounts.mapper';
import {
  TableAccountsRepository,
  type FiscalCustomerData,
  type ProductFiscalRecord,
  type TableAccountSaleRecord,
} from './table-accounts.repository';

@Injectable()
export class TableAccountsService {
  constructor(
    private readonly repository: TableAccountsRepository,
    private readonly auditService: AuditService,
    private readonly fiscalService: FiscalService,
  ) {}

  async getCurrentAccount(
    actor: OperationsActor,
    tableId: string,
  ): Promise<TableAccountDto | null> {
    const branchId = requireBranch(actor);
    const account = await this.repository.findOpenByTable(actor.tenantId, branchId, tableId);
    if (account) {
      const invoice = await this.repository.findLatestInvoiceBySaleId(actor.tenantId, account.id);
      return toTableAccountDto(account, invoice);
    }

    const tableExists = await this.repository.tableExists(actor.tenantId, branchId, tableId);
    if (!tableExists) {
      throw notFound('Dining table');
    }

    return null;
  }

  async openAccount(
    actor: OperationsActor,
    tableId: string,
    dto: OpenTableAccountDto,
  ): Promise<TableAccountDto> {
    const branchId = requireBranch(actor);
    const waiterName =
      actor.role === 'WAITER'
        ? (cleanOptional(actor.fullName) ?? null)
        : (cleanOptional(dto.waiterName) ?? null);
    const account = await this.repository.openAccount({
      tenantId: actor.tenantId,
      branchId,
      tableId,
      waiterName,
      guestCount: dto.guestCount ?? null,
      customerName: cleanOptional(dto.customerName) ?? null,
      createdById: actor.actorUserId,
    });
    if (!account) {
      throw notFound('Dining table');
    }

    const result = toTableAccountDto(account);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'TABLE_ACCOUNT_OPENED',
      entityType: 'Sale',
      entityId: account.id,
      after: asJson(result),
    });

    return result;
  }

  async addItem(
    actor: OperationsActor,
    saleId: string,
    dto: AddTableAccountItemDto,
  ): Promise<TableAccountDto> {
    const branchId = requireBranch(actor);
    await this.requireOpenAccount(actor.tenantId, branchId, saleId);

    const product = await this.repository.findSellableProduct(actor.tenantId, dto.productId);
    if (!product) {
      throw notFound('Product');
    }

    const account = await this.repository.addItem(actor.tenantId, branchId, saleId, {
      productId: product.id,
      name: product.name,
      unitPriceAmount: product.priceAmount,
      quantity: dto.quantity ?? 1,
      ...resolveProductFiscalSnapshot(product),
    });
    if (!account) {
      throw notFound('Table account');
    }

    const result = toTableAccountDto(account);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'TABLE_ACCOUNT_ITEM_ADDED',
      entityType: 'Sale',
      entityId: saleId,
      after: asJson({
        productId: product.id,
        quantity: dto.quantity ?? 1,
        total: result.grandTotal,
      }),
    });

    return result;
  }

  async updateItem(
    actor: OperationsActor,
    saleId: string,
    itemId: string,
    dto: UpdateTableAccountItemDto,
  ): Promise<TableAccountDto> {
    const branchId = requireBranch(actor);
    await this.requireOpenAccount(actor.tenantId, branchId, saleId);

    const account = await this.repository.updateItemQuantity(
      actor.tenantId,
      branchId,
      saleId,
      itemId,
      dto.quantity,
    );
    if (!account) {
      throw notFound('Sale item');
    }

    const result = toTableAccountDto(account);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'TABLE_ACCOUNT_ITEM_UPDATED',
      entityType: 'Sale',
      entityId: saleId,
      after: asJson({ itemId, quantity: dto.quantity, total: result.grandTotal }),
    });

    return result;
  }

  async removeItem(
    actor: OperationsActor,
    saleId: string,
    itemId: string,
  ): Promise<TableAccountDto> {
    const branchId = requireBranch(actor);
    await this.requireOpenAccount(actor.tenantId, branchId, saleId);

    const account = await this.repository.removeItem(actor.tenantId, branchId, saleId, itemId);
    if (!account) {
      throw notFound('Sale item');
    }

    const result = toTableAccountDto(account);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'TABLE_ACCOUNT_ITEM_REMOVED',
      entityType: 'Sale',
      entityId: saleId,
      after: asJson({ itemId, total: result.grandTotal }),
    });

    return result;
  }

  async getCommand(actor: OperationsActor, saleId: string): Promise<KitchenCommandDto> {
    const branchId = requireBranch(actor);
    const account = await this.requireAccount(actor.tenantId, branchId, saleId);
    return toKitchenCommandDto(account);
  }

  async getReceipt(actor: OperationsActor, saleId: string): Promise<ReceiptDto> {
    const branchId = requireBranch(actor);
    const account = await this.requireAccount(actor.tenantId, branchId, saleId);
    const invoice = await this.repository.findLatestInvoiceBySaleId(actor.tenantId, account.id);
    return toReceiptDto(account, invoice);
  }

  async chargeAccount(
    actor: OperationsActor,
    saleId: string,
    dto: ChargeTableAccountDto,
  ): Promise<ReceiptDto> {
    const branchId = requireBranch(actor);
    const account = await this.requireOpenAccount(actor.tenantId, branchId, saleId);
    if (account.items.length === 0) {
      throw badRequest('A table account must have at least one item before charging.');
    }

    const balanceDue = account.grandTotal - account.paidTotal;
    if (balanceDue <= 0) {
      throw badRequest('This table account has no pending balance.');
    }

    const normalizedPayments = dto.payments?.length
      ? dto.payments.map((payment) => {
          const paymentForm = payment.paymentForm ?? 1;
          if (paymentForm === 2 && !payment.dueDate) {
            throw badRequest('Los pagos a credito requieren fecha de vencimiento.');
          }
          return {
            method: payment.method as PaymentMethod,
            amount: payment.amount,
            reference: cleanOptional(payment.reference) ?? null,
            factusPaymentMethodCode: cleanOptional(payment.factusPaymentMethodCode) ?? null,
            paymentForm: paymentForm as 1 | 2,
            dueDate: payment.dueDate ? new Date(`${payment.dueDate}T00:00:00.000Z`) : null,
          };
        })
      : undefined;
    const amount = normalizedPayments
      ? normalizedPayments.reduce((total, payment) => total + payment.amount, 0)
      : (dto.amount ?? balanceDue);
    if (amount !== balanceDue) {
      throw badRequest('The payment amount must match the pending balance.');
    }

    const customer = this.resolveFiscalCustomer(dto.requiresInvoice, dto.customer);
    const charged = await this.repository.chargeAccount({
      tenantId: actor.tenantId,
      branchId,
      saleId,
      method: dto.method as PaymentMethod,
      amount,
      reference: cleanOptional(dto.reference) ?? null,
      factusPaymentMethodCode: cleanOptional(dto.factusPaymentMethodCode) ?? null,
      payments: normalizedPayments,
      requiresInvoice: dto.requiresInvoice,
      customer,
      chargedById: actor.actorUserId,
    });

    if (charged.status === 'NO_ACTIVE_CASH_SESSION') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'Debe abrir el turno de caja (base inicial) para poder registrar ventas',
      });
    }
    if (charged.status === 'ACCOUNT_NOT_FOUND') {
      throw notFound('Table account');
    }
    if (charged.status === 'INSUFFICIENT_STOCK') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: `Insufficient stock for ${charged.itemName}.`,
      });
    }
    if (charged.status === 'INVENTORY_NOT_CONFIGURED') {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'Este producto no tiene receta ni insumo de inventario configurado.',
      });
    }

    const receipt = toReceiptDto(charged.account, charged.invoice);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'TABLE_ACCOUNT_CHARGED',
      entityType: 'Sale',
      entityId: saleId,
      after: asJson({
        method: dto.method,
        amount,
        requiresInvoice: dto.requiresInvoice,
        invoiceId: charged.invoice?.id ?? null,
      }),
    });

    if (charged.invoice) {
      await this.auditService.tryRecord({
        ...auditBase(actor, branchId),
        action: 'INVOICE_DRAFT_CREATED',
        entityType: 'Invoice',
        entityId: charged.invoice.id,
        after: asJson({
          saleId,
          status: charged.invoice.status,
          customerName: charged.invoice.customerName,
          totalAmount: charged.invoice.totalAmount,
        }),
      });

      await this.fiscalService.tryScheduleInvoiceIssue(actor, charged.invoice.id);
    }

    return receipt;
  }

  private resolveFiscalCustomer(
    requiresInvoice: boolean,
    customer?: ChargeFiscalCustomerDto,
  ): FiscalCustomerData | null {
    if (!requiresInvoice) {
      return null;
    }
    if (!customer) {
      return {
        documentType: CustomerDocumentType.OTHER,
        documentNumber: '222222222222',
        dv: null,
        name: 'Consumidor Final',
        email: null,
        phone: null,
        address: null,
        municipality: null,
        municipalityCode: null,
        countryCode: 'CO',
        taxResponsibility: null,
      };
    }

    const documentNumber = customer.documentNumber.trim().replace(/\s/g, '');
    const dv =
      cleanOptional(customer.dv) ??
      (customer.documentType === 'NIT' ? computeNitVerificationDigit(documentNumber) : null);
    if (customer.documentType === 'NIT' && !dv) {
      throw badRequest('El NIT requiere digito de verificacion.');
    }
    const countryCode = cleanOptional(customer.countryCode)?.toUpperCase() ?? 'CO';
    const municipalityCode = cleanOptional(customer.municipalityCode) ?? null;
    if (countryCode === 'CO' && (!municipalityCode || !/^\d{5}$/.test(municipalityCode))) {
      throw badRequest(
        'El cliente identificado en Colombia requiere un municipio DIVIPOLA de cinco digitos.',
      );
    }
    if (
      !cleanOptional(customer.email) ||
      !cleanOptional(customer.address) ||
      !cleanOptional(customer.phone)
    ) {
      throw badRequest(
        'El cliente identificado requiere correo, direccion y telefono para el flujo fiscal de GastroAI.',
      );
    }

    return {
      documentType: customer.documentType as CustomerDocumentType,
      documentNumber,
      dv,
      name: customer.name.trim(),
      email: cleanOptional(customer.email) ?? null,
      phone: cleanOptional(customer.phone) ?? null,
      address: cleanOptional(customer.address) ?? null,
      municipality: cleanOptional(customer.municipality) ?? null,
      municipalityCode,
      countryCode,
      taxResponsibility: cleanOptional(customer.taxResponsibility) ?? null,
    };
  }

  private async requireOpenAccount(
    tenantId: string,
    branchId: string,
    saleId: string,
  ): Promise<TableAccountSaleRecord> {
    const account = await this.requireAccount(tenantId, branchId, saleId);
    if (account.status !== SaleStatus.DRAFT) {
      throw new ApplicationException(409, {
        code: ApiErrorCode.CONFLICT,
        message: 'This table account is already closed.',
      });
    }
    return account;
  }

  private async requireAccount(
    tenantId: string,
    branchId: string,
    saleId: string,
  ): Promise<TableAccountSaleRecord> {
    const account = await this.repository.findById(tenantId, branchId, saleId);
    if (!account) {
      throw notFound('Table account');
    }
    return account;
  }
}

function resolveProductFiscalSnapshot(product: ProductFiscalRecord): {
  fiscalName: string | null;
  fiscalCodeReference: string | null;
  unitMeasureCode: string;
  standardCode: string;
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
} {
  const taxProfile = resolveTaxProfile(product);
  return {
    fiscalName: cleanOptional(product.fiscalName) ?? product.name,
    fiscalCodeReference: cleanOptional(product.fiscalCodeReference) ?? product.sku ?? product.id,
    unitMeasureCode: cleanOptional(product.unitMeasureCode) ?? '94',
    standardCode: cleanOptional(product.standardCode) ?? '999',
    ...taxProfile,
  };
}

function resolveTaxProfile(product: ProductFiscalRecord): {
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
} {
  if (product.taxCategory) {
    return taxProfileFromCategory(product.taxCategory);
  }
  if (product.isExcluded) {
    return { factusTaxCode: '01', taxRateBasisPoints: 0, isTaxExcluded: true };
  }
  if (product.incApplies) {
    return { factusTaxCode: '04', taxRateBasisPoints: 800, isTaxExcluded: false };
  }
  return { factusTaxCode: '01', taxRateBasisPoints: 0, isTaxExcluded: false };
}

function taxProfileFromCategory(taxCategory: TaxCategory): {
  factusTaxCode: string;
  taxRateBasisPoints: number;
  isTaxExcluded: boolean;
} {
  return {
    factusTaxCode: taxCategory.factusTaxCode,
    taxRateBasisPoints: taxCategory.isExcluded ? 0 : taxCategory.rateBasisPoints,
    isTaxExcluded: taxCategory.isExcluded,
  };
}

function requireBranch(actor: OperationsActor): string {
  if (!actor.branchId) {
    throw badRequest('A branch context is required for table account operations.');
  }
  return actor.branchId;
}

function auditBase(actor: OperationsActor, branchId: string) {
  return {
    tenantId: actor.tenantId,
    branchId,
    actorUserId: actor.actorUserId,
    requestId: actor.requestId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  };
}

function cleanOptional(value?: string | null): string | undefined {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

function badRequest(message: string): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message,
  });
}

function notFound(entity: string): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: `${entity} was not found.`,
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
