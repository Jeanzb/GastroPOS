import { Injectable } from '@nestjs/common';
import type { CustomerDto, PaginatedResult } from '@gastroai/contracts';
import { type CustomerDocumentType, type Prisma } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { parseColombianNit } from '../../common/fiscal/colombian-nit';
import { createPaginatedResult, normalizePagination } from '../../common/pagination/pagination';
import type { TenantRequestContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CustomerRepository } from './customer.repository';
import { toCustomerDto } from './customer.mapper';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    ctx: TenantRequestContext,
    query: ListCustomersQueryDto,
  ): Promise<PaginatedResult<CustomerDto>> {
    const pagination = normalizePagination(query);
    const filters = { isActive: query.isActive, search: query.search };

    const [rows, total] = await Promise.all([
      this.repository.findMany(filters, pagination),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(rows.map(toCustomerDto), total, pagination);
  }

  async getById(_ctx: TenantRequestContext, id: string): Promise<CustomerDto> {
    const customer = await this.repository.findById(id);
    if (!customer) {
      throw notFound();
    }
    return toCustomerDto(customer);
  }

  async create(ctx: TenantRequestContext, dto: CreateCustomerDto): Promise<CustomerDto> {
    const normalized = normalizeCustomer({
      ...dto,
      documentType: dto.documentType as CustomerDocumentType,
    });

    const existing = await this.repository.findByDocument(
      normalized.documentType,
      normalized.documentNumber,
    );
    if (existing) {
      throw duplicateDocument(normalized.documentNumber);
    }

    const created = await this.repository.create({
      ...normalized,
      isActive: dto.isActive ?? true,
      createdById: ctx.actorUserId,
    });

    const result = toCustomerDto(created);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async update(
    ctx: TenantRequestContext,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const normalized = normalizeCustomer({
      documentType: (dto.documentType ?? existing.documentType) as CustomerDocumentType,
      documentNumber: dto.documentNumber ?? existing.documentNumber,
      dv: dto.dv === undefined ? existing.dv : dto.dv,
      name: dto.name ?? existing.name,
      email: dto.email === undefined ? existing.email : dto.email,
      phone: dto.phone === undefined ? existing.phone : dto.phone,
      address: dto.address === undefined ? existing.address : dto.address,
      countryCode: dto.countryCode ?? existing.countryCode,
      municipality: dto.municipality === undefined ? existing.municipality : dto.municipality,
      municipalityCode:
        dto.municipalityCode === undefined ? existing.municipalityCode : dto.municipalityCode,
      tributeCode: dto.tributeCode ?? existing.tributeCode,
      taxResponsibility:
        dto.taxResponsibility === undefined ? existing.taxResponsibility : dto.taxResponsibility,
    });
    const documentChanged =
      normalized.documentType !== existing.documentType ||
      normalized.documentNumber !== existing.documentNumber;
    if (documentChanged) {
      const clash = await this.repository.findByDocument(
        normalized.documentType,
        normalized.documentNumber,
      );
      if (clash && clash.id !== id) {
        throw duplicateDocument(normalized.documentNumber);
      }
    }

    const before = toCustomerDto(existing);
    const updated = await this.repository.update(id, {
      ...normalized,
      isActive: dto.isActive,
      updatedById: ctx.actorUserId,
    });

    const after = toCustomerDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    return after;
  }

  async remove(ctx: TenantRequestContext, id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }

    await this.repository.softDelete(id, ctx.actorUserId);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      before: asJson(toCustomerDto(existing)),
    });
  }
}

interface CustomerInput {
  documentType: CustomerDocumentType;
  documentNumber: string;
  dv?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  countryCode?: string | null;
  municipality?: string | null;
  municipalityCode?: string | null;
  tributeCode?: string | null;
  taxResponsibility?: string | null;
}

function normalizeCustomer(input: CustomerInput) {
  const documentType = input.documentType;
  let documentNumber = input.documentNumber.trim();
  let dv: string | null = null;

  if (documentType === 'NIT') {
    const nit = parseColombianNit(documentNumber, input.dv);
    if (!nit?.isValid) {
      throw invalidFiscalCustomer('El NIT y su digito de verificacion no coinciden.');
    }
    documentNumber = nit.number;
    dv = nit.verificationDigit;
  } else if (documentType === 'CC' || documentType === 'TI' || documentType === 'NUIP') {
    if (!/^\d+$/.test(documentNumber)) {
      throw invalidFiscalCustomer('El tipo de documento seleccionado solo admite numeros.');
    }
  }

  const countryCode = (input.countryCode?.trim() || 'CO').toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw invalidFiscalCustomer('El pais debe usar un codigo ISO de dos letras.');
  }
  const municipalityCode = cleanOptional(input.municipalityCode);
  if (countryCode === 'CO' && !/^\d{5}$/.test(municipalityCode ?? '')) {
    throw invalidFiscalCustomer(
      'Un cliente residente en Colombia requiere municipio DIVIPOLA de cinco digitos.',
    );
  }

  const name = input.name.trim();
  const email = cleanOptional(input.email);
  const address = cleanOptional(input.address);
  if (!email || !address) {
    throw invalidFiscalCustomer(
      'El cliente fiscal requiere correo y direccion antes de guardarse.',
    );
  }
  const taxResponsibility = cleanOptional(input.taxResponsibility);
  return {
    documentType,
    documentNumber,
    dv,
    factusIdentificationCode: mapFactusDocumentCode(documentType),
    legalOrganizationCode: documentType === 'NIT' ? '1' : '2',
    company: documentType === 'NIT' ? name : null,
    names: documentType === 'NIT' ? null : name,
    name,
    email,
    phone: cleanOptional(input.phone),
    address,
    countryCode,
    municipality: cleanOptional(input.municipality),
    municipalityCode: countryCode === 'CO' ? municipalityCode : null,
    tributeCode: cleanOptional(input.tributeCode) ?? 'ZZ',
    taxResponsibility,
    taxResponsibilities: taxResponsibility ? [taxResponsibility] : [],
  };
}

function cleanOptional(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function mapFactusDocumentCode(type: CustomerDocumentType): string {
  const codes: Record<CustomerDocumentType, string> = {
    CC: '13',
    NIT: '31',
    CE: '22',
    PP: '41',
    TI: '12',
    NUIP: '91',
    OTHER: '13',
  };
  return codes[type];
}

function invalidFiscalCustomer(message: string): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.VALIDATION_ERROR,
    message,
  });
}

function auditBase(ctx: TenantRequestContext) {
  return {
    tenantId: ctx.tenantId,
    branchId: ctx.branchId,
    actorUserId: ctx.actorUserId,
  };
}

function notFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Customer was not found.',
  });
}

function duplicateDocument(documentNumber: string): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: `A customer with document "${documentNumber}" already exists.`,
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
