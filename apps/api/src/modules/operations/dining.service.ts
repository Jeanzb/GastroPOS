import { Injectable } from '@nestjs/common';
import type {
  DiningTableDto,
  DiningZoneDto,
  UpdateDiningTableStatusRequest,
} from '@gastroai/contracts';
import type { DiningTableStatus, Prisma } from '../../../generated/prisma';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { ApplicationException } from '../../common/errors/application.exception';
import { AuditService } from '../audit/audit.service';
import type { OperationsActor } from './operations.types';
import type { CreateDiningTableDto } from './dto/create-dining-table.dto';
import type { CreateDiningZoneDto } from './dto/create-dining-zone.dto';
import type { UpdateDiningTableDto } from './dto/update-dining-table.dto';
import type { UpdateDiningZoneDto } from './dto/update-dining-zone.dto';
import { toDiningTableDto, toDiningZoneDto } from './dining.mapper';
import { DiningRepository } from './dining.repository';

@Injectable()
export class DiningService {
  constructor(
    private readonly repository: DiningRepository,
    private readonly auditService: AuditService,
  ) {}

  async listZones(actor: OperationsActor): Promise<DiningZoneDto[]> {
    const branchId = requireBranch(actor);
    const zones = await this.repository.findZonesWithTables(actor.tenantId, branchId);
    return zones.map(toDiningZoneDto);
  }

  async createZone(actor: OperationsActor, dto: CreateDiningZoneDto): Promise<DiningZoneDto> {
    const branchId = requireBranch(actor);
    const name = dto.name.trim();
    const existing = await this.repository.findZoneByName(actor.tenantId, name, branchId);
    if (existing) {
      throw duplicateName('Dining zone', name);
    }

    const created = await this.repository.createZone({
      branchId,
      tenantId: actor.tenantId,
      name,
      sortOrder: dto.sortOrder ?? 0,
      createdById: actor.actorUserId,
    });
    const result = toDiningZoneDto({ ...created, tables: [] });
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_ZONE_CREATED',
      entityType: 'DiningZone',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async updateZone(
    actor: OperationsActor,
    id: string,
    dto: UpdateDiningZoneDto,
  ): Promise<DiningZoneDto> {
    const branchId = requireBranch(actor);
    const existing = await this.repository.findZoneById(actor.tenantId, id, branchId);
    if (!existing) {
      throw notFound('Dining zone');
    }

    const name = dto.name?.trim();
    if (name && name !== existing.name) {
      const clash = await this.repository.findZoneByName(actor.tenantId, name, branchId);
      if (clash && clash.id !== id) {
        throw duplicateName('Dining zone', name);
      }
    }

    const updated = await this.repository.updateZone(actor.tenantId, id, branchId, {
      name,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      updatedById: actor.actorUserId,
    });
    if (!updated) {
      throw notFound('Dining zone');
    }

    const before = { ...existing, tables: [] };
    const after = toDiningZoneDto({ ...updated, tables: [] });
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_ZONE_UPDATED',
      entityType: 'DiningZone',
      entityId: id,
      before: asJson(toDiningZoneDto(before)),
      after: asJson(after),
    });

    return after;
  }

  async createTable(
    actor: OperationsActor,
    zoneId: string,
    dto: CreateDiningTableDto,
  ): Promise<DiningTableDto> {
    const branchId = requireBranch(actor);
    await this.requireZone(actor.tenantId, zoneId, branchId);
    const number = dto.number.trim();
    const existing = await this.repository.findTableByNumber(actor.tenantId, number, branchId);
    if (existing) {
      throw duplicateName('Dining table', number);
    }

    const created = await this.repository.createTable({
      branchId,
      tenantId: actor.tenantId,
      zoneId,
      number,
      seats: dto.seats,
      createdById: actor.actorUserId,
    });

    const result = toDiningTableDto(created);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_TABLE_CREATED',
      entityType: 'DiningTable',
      entityId: created.id,
      after: asJson(result),
    });

    return result;
  }

  async updateTable(
    actor: OperationsActor,
    id: string,
    dto: UpdateDiningTableDto,
  ): Promise<DiningTableDto> {
    const branchId = requireBranch(actor);
    const existing = await this.repository.findTableById(actor.tenantId, id, branchId);
    if (!existing) {
      throw notFound('Dining table');
    }

    const number = dto.number?.trim();
    if (number && number !== existing.number) {
      const clash = await this.repository.findTableByNumber(actor.tenantId, number, branchId);
      if (clash && clash.id !== id) {
        throw duplicateName('Dining table', number);
      }
    }

    if (dto.zoneId && dto.zoneId !== existing.zoneId) {
      await this.requireZone(actor.tenantId, dto.zoneId, branchId);
    }

    const updated = await this.repository.updateTable(actor.tenantId, id, branchId, {
      number,
      seats: dto.seats,
      zoneId: dto.zoneId,
      updatedById: actor.actorUserId,
    });
    if (!updated) {
      throw notFound('Dining table');
    }

    const before = toDiningTableDto(existing);
    const after = toDiningTableDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_TABLE_UPDATED',
      entityType: 'DiningTable',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    return after;
  }

  async updateTableStatus(
    actor: OperationsActor,
    id: string,
    dto: UpdateDiningTableStatusRequest,
  ): Promise<DiningTableDto> {
    const branchId = requireBranch(actor);
    const existing = await this.repository.findTableById(actor.tenantId, id, branchId);
    if (!existing) {
      throw notFound('Dining table');
    }

    const data = statusData(dto, existing.openedAt, actor.actorUserId);
    const updated = await this.repository.updateTableStatus(actor.tenantId, id, branchId, data);
    if (!updated) {
      throw notFound('Dining table');
    }

    const before = toDiningTableDto(existing);
    const after = toDiningTableDto(updated);
    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_TABLE_STATUS_UPDATED',
      entityType: 'DiningTable',
      entityId: id,
      before: asJson(before),
      after: asJson(after),
    });

    return after;
  }

  async deleteZone(actor: OperationsActor, id: string): Promise<void> {
    const branchId = requireBranch(actor);
    const existing = await this.repository.findZoneById(actor.tenantId, id, branchId);
    if (!existing) {
      throw notFound('Dining zone');
    }

    const removed = await this.repository.softDeleteZone(
      actor.tenantId,
      id,
      branchId,
      actor.actorUserId,
    );
    if (!removed) {
      throw notFound('Dining zone');
    }

    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_ZONE_DELETED',
      entityType: 'DiningZone',
      entityId: id,
      before: asJson(toDiningZoneDto({ ...existing, tables: [] })),
    });
  }

  async deleteTable(actor: OperationsActor, id: string): Promise<void> {
    const branchId = requireBranch(actor);
    const existing = await this.repository.findTableById(actor.tenantId, id, branchId);
    if (!existing) {
      throw notFound('Dining table');
    }

    const removed = await this.repository.softDeleteTable(
      actor.tenantId,
      id,
      branchId,
      actor.actorUserId,
    );
    if (!removed) {
      throw notFound('Dining table');
    }

    await this.auditService.tryRecord({
      ...auditBase(actor, branchId),
      action: 'DINING_TABLE_DELETED',
      entityType: 'DiningTable',
      entityId: id,
      before: asJson(toDiningTableDto(existing)),
    });
  }

  private async requireZone(tenantId: string, zoneId: string, branchId: string): Promise<void> {
    const zone = await this.repository.findZoneById(tenantId, zoneId, branchId);
    if (!zone || !zone.isActive) {
      throw notFound('Dining zone');
    }
  }
}

function statusData(
  dto: UpdateDiningTableStatusRequest,
  openedAt: Date | null,
  actorUserId: string,
) {
  if (dto.status === 'FREE') {
    return {
      status: dto.status as DiningTableStatus,
      waiterName: null,
      openedAt: null,
      reservationName: null,
      reservationTime: null,
      notes: dto.notes ?? null,
      updatedById: actorUserId,
    };
  }

  if (dto.status === 'RESERVED') {
    return {
      status: dto.status as DiningTableStatus,
      waiterName: null,
      openedAt: null,
      reservationName: dto.reservationName ?? null,
      reservationTime: dto.reservationTime ?? null,
      notes: dto.notes ?? null,
      updatedById: actorUserId,
    };
  }

  return {
    status: dto.status as DiningTableStatus,
    waiterName: dto.waiterName ?? null,
    openedAt: openedAt ?? new Date(),
    reservationName: null,
    reservationTime: null,
    notes: dto.notes ?? null,
    updatedById: actorUserId,
  };
}

function requireBranch(actor: OperationsActor): string {
  if (!actor.branchId) {
    throw new ApplicationException(400, {
      code: ApiErrorCode.BAD_REQUEST,
      message: 'A branch context is required for dining operations.',
    });
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

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function notFound(entity: string): ApplicationException {
  return new ApplicationException(404, {
    code: ApiErrorCode.NOT_FOUND,
    message: `${entity} was not found.`,
  });
}

function duplicateName(entity: string, name: string): ApplicationException {
  return new ApplicationException(409, {
    code: ApiErrorCode.CONFLICT,
    message: `${entity} named "${name}" already exists.`,
  });
}
