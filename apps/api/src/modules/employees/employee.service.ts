import { Injectable } from '@nestjs/common';
import type { EmployeeDto, PaginatedResult } from '@gastroai/contracts';
import type { Prisma } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import {
  createPaginatedResult,
  normalizePagination,
} from '../../common/pagination/pagination';
import type { TenantRequestContext } from '../auth/auth.types';
import { PasswordHashingService } from '../auth/application/password-hashing.service';
import { AuditService } from '../audit/audit.service';
import { EmployeeRepository } from './employee.repository';
import { toEmployeeDto } from './employee.mapper';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import type { UpdateEmployeeAccessDto } from './dto/update-employee-access.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly repository: EmployeeRepository,
    private readonly passwordHashing: PasswordHashingService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    ctx: TenantRequestContext,
    query: ListEmployeesQueryDto,
  ): Promise<PaginatedResult<EmployeeDto>> {
    const pagination = normalizePagination(query);
    const filters = {
      tenantId: ctx.tenantId,
      role: query.role,
      isActive: query.isActive,
      branchId: query.branchId,
      search: query.search,
    };

    const [rows, total] = await Promise.all([
      this.repository.findMany(filters, pagination),
      this.repository.count(filters),
    ]);

    return createPaginatedResult(rows.map(toEmployeeDto), total, pagination);
  }

  async getById(ctx: TenantRequestContext, id: string): Promise<EmployeeDto> {
    const employee = await this.repository.findById(ctx.tenantId, id);
    if (!employee) {
      throw notFound();
    }

    return toEmployeeDto(employee);
  }

  async create(ctx: TenantRequestContext, dto: CreateEmployeeDto): Promise<EmployeeDto> {
    const email = normalizeEmail(dto.email);
    const existing = await this.repository.findByEmail(ctx.tenantId, email);
    if (existing) {
      throw duplicateEmail(email);
    }

    const branchId = await this.resolveBranchId(ctx, dto.branchId);
    const passwordHash = await this.passwordHashing.hash(dto.temporaryPassword);

    const created = await this.repository.create({
      tenantId: ctx.tenantId,
      branchId,
      email,
      fullName: dto.fullName.trim(),
      role: dto.role,
      passwordHash,
      isActive: dto.isActive ?? true,
      createdById: ctx.actorUserId,
    });

    const result = toEmployeeDto(created);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'EMPLOYEE_CREATED',
      entityType: 'User',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async update(
    ctx: TenantRequestContext,
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    const existing = await this.repository.findById(ctx.tenantId, id);
    if (!existing) {
      throw notFound();
    }

    const email = dto.email ? normalizeEmail(dto.email) : undefined;
    if (email && email !== existing.email) {
      const clash = await this.repository.findByEmail(ctx.tenantId, email);
      if (clash && clash.id !== id) {
        throw duplicateEmail(email);
      }
    }

    const branchId =
      dto.branchId === undefined ? undefined : await this.resolveBranchId(ctx, dto.branchId);

    if (dto.isActive === false && id === ctx.actorUserId) {
      throw selfAccessChange();
    }

    const before = toEmployeeDto(existing);
    const updated = await this.repository.update(ctx.tenantId, id, {
      email,
      fullName: dto.fullName?.trim(),
      role: dto.role,
      branchId,
      isActive: dto.isActive,
      updatedById: ctx.actorUserId,
    });

    const after = toEmployeeDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'EMPLOYEE_UPDATED',
      entityType: 'User',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    return after;
  }

  async updateAccess(
    ctx: TenantRequestContext,
    id: string,
    dto: UpdateEmployeeAccessDto,
  ): Promise<EmployeeDto> {
    if (!dto.isActive && id === ctx.actorUserId) {
      throw selfAccessChange();
    }

    return this.update(ctx, id, { isActive: dto.isActive });
  }

  async remove(ctx: TenantRequestContext, id: string): Promise<void> {
    if (id === ctx.actorUserId) {
      throw selfAccessChange();
    }

    const existing = await this.repository.findById(ctx.tenantId, id);
    if (!existing) {
      throw notFound();
    }

    await this.repository.softDelete(ctx.tenantId, id, ctx.actorUserId);
    await this.auditService.tryRecord({
      ...auditBase(ctx),
      action: 'EMPLOYEE_DELETED',
      entityType: 'User',
      entityId: id,
      before: asJson(toEmployeeDto(existing)),
    });
  }

  private async resolveBranchId(
    ctx: TenantRequestContext,
    branchId: string | null | undefined,
  ): Promise<string | null> {
    const resolved = branchId === undefined ? ctx.branchId : branchId?.trim() || null;
    if (!resolved) {
      return null;
    }

    const branch = await this.repository.findBranchById(ctx.tenantId, resolved);
    if (!branch) {
      throw branchNotFound();
    }

    return branch.id;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    message: 'Employee was not found.',
  });
}

function branchNotFound(): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: 'Branch was not found.',
  });
}

function duplicateEmail(email: string): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: `An employee with email "${email}" already exists.`,
  });
}

function selfAccessChange(): ApplicationException {
  return new ApplicationException(400, {
    code: ApiErrorCode.BAD_REQUEST,
    message: 'You cannot disable or delete your own employee account.',
  });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
