import { Injectable } from '@nestjs/common';
import type { PaginatedResult, SupplierDto } from '@gastroai/contracts';
import { parseColombianNit } from '@gastroai/contracts';
import type { Prisma } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import {
  createPaginatedResult,
  normalizePagination,
} from '../../common/pagination/pagination';
import type { TenantRequestContext } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { SupplierRepository } from './supplier.repository';
import { toSupplierDto } from './supplier.mapper';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    private readonly repository: SupplierRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    ctx: TenantRequestContext,
    query: ListSuppliersQueryDto,
  ): Promise<PaginatedResult<SupplierDto>> {
    const pagination = normalizePagination(query);
    const filters = { isActive: query.isActive, search: query.search };

    const [rows, total] = await Promise.all([
      this.repository.findMany(filters, pagination),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(rows.map(toSupplierDto), total, pagination);
  }

  async getById(_ctx: TenantRequestContext, id: string): Promise<SupplierDto> {
    const supplier = await this.repository.findById(id);
    if (!supplier) {
      throw notFound();
    }
    return toSupplierDto(supplier);
  }

  async create(
    ctx: TenantRequestContext,
    dto: CreateSupplierDto,
  ): Promise<SupplierDto> {
    const name = dto.name.trim();
    const existing = await this.repository.findByName(name);
    if (existing) {
      throw duplicateName(name);
    }

    const created = await this.repository.create({
      name,
      documentNumber: normalizeSupplierDocument(dto.documentNumber, dto.documentVerificationDigit),
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      isActive: dto.isActive ?? true,
      createdById: ctx.actorUserId,
    });

    const result = toSupplierDto(created);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async update(
    ctx: TenantRequestContext,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const name = dto.name?.trim();
    if (name && name !== existing.name) {
      const clash = await this.repository.findByName(name);
      if (clash && clash.id !== id) {
        throw duplicateName(name);
      }
    }

    const before = toSupplierDto(existing);
    const updated = await this.repository.update(id, {
      name,
      documentNumber:
        dto.documentNumber === undefined
          ? undefined
          : normalizeSupplierDocument(dto.documentNumber, dto.documentVerificationDigit),
      email: dto.email === undefined ? undefined : dto.email.trim() || null,
      phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
      address: dto.address === undefined ? undefined : dto.address.trim() || null,
      isActive: dto.isActive,
      updatedById: ctx.actorUserId,
    });

    const after = toSupplierDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'SUPPLIER_UPDATED',
      entityType: 'Supplier',
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
      action: 'SUPPLIER_DELETED',
      entityType: 'Supplier',
      entityId: id,
      before: asJson(toSupplierDto(existing)),
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
    message: 'Supplier was not found.',
  });
}

function duplicateName(name: string): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: `A supplier named "${name}" already exists.`,
  });
}

function normalizeSupplierDocument(
  value?: string,
  verificationDigit?: string,
): string | null {
  const document = value?.trim();
  if (!document) {
    return null;
  }

  if (/^NIT\s*/i.test(document) || verificationDigit) {
    const nit = parseColombianNit(document, verificationDigit);
    if (!nit) {
      throw invalidSupplierNit('Ingresa un NIT valido para el proveedor.');
    }
    if (!nit.isValid) {
      throw invalidSupplierNit(
        `El digito de verificacion del NIT del proveedor debe ser ${nit.expectedVerificationDigit}.`,
      );
    }
    return `NIT ${nit.formatted}`;
  }

  return document;
}

function invalidSupplierNit(message: string): ApplicationException {
  return new ApplicationException(400, {
    code: 'INVALID_SUPPLIER_NIT',
    message,
    details: { fields: { documentVerificationDigit: message } },
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
