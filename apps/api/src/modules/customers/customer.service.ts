import { Injectable } from '@nestjs/common';
import type { CustomerDto, PaginatedResult } from '@gastroai/contracts';
import {
  type CustomerDocumentType,
  type Prisma,
} from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import {
  createPaginatedResult,
  normalizePagination,
} from '../../common/pagination/pagination';
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

  async create(
    ctx: TenantRequestContext,
    dto: CreateCustomerDto,
  ): Promise<CustomerDto> {
    const documentNumber = dto.documentNumber.trim();
    const documentType = dto.documentType as CustomerDocumentType;

    const existing = await this.repository.findByDocument(
      documentType,
      documentNumber,
    );
    if (existing) {
      throw duplicateDocument(documentNumber);
    }

    const created = await this.repository.create({
      documentType,
      documentNumber,
      name: dto.name.trim(),
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      municipality: dto.municipality?.trim() || null,
      taxResponsibility: dto.taxResponsibility?.trim() || null,
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

    const documentType = (dto.documentType ??
      existing.documentType) as CustomerDocumentType;
    const documentNumber = dto.documentNumber?.trim() ?? existing.documentNumber;
    const documentChanged =
      documentType !== existing.documentType ||
      documentNumber !== existing.documentNumber;
    if (documentChanged) {
      const clash = await this.repository.findByDocument(
        documentType,
        documentNumber,
      );
      if (clash && clash.id !== id) {
        throw duplicateDocument(documentNumber);
      }
    }

    const before = toCustomerDto(existing);
    const updated = await this.repository.update(id, {
      documentType: dto.documentType ? documentType : undefined,
      documentNumber: dto.documentNumber === undefined ? undefined : documentNumber,
      name: dto.name?.trim(),
      email: dto.email === undefined ? undefined : dto.email.trim() || null,
      phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
      address: dto.address === undefined ? undefined : dto.address.trim() || null,
      municipality:
        dto.municipality === undefined ? undefined : dto.municipality.trim() || null,
      taxResponsibility:
        dto.taxResponsibility === undefined
          ? undefined
          : dto.taxResponsibility.trim() || null,
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
