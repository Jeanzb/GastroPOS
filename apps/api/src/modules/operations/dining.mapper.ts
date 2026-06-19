import type { DiningTableDto, DiningZoneDto } from '@gastroai/contracts';
import type { DiningTable, DiningZone } from '../../../generated/prisma';

export type DiningZoneWithTables = DiningZone & { tables: DiningTable[] };

export function toDiningTableDto(table: DiningTable): DiningTableDto {
  return {
    id: table.id,
    zoneId: table.zoneId,
    branchId: table.branchId,
    number: table.number,
    seats: table.seats,
    status: table.status,
    waiterName: table.waiterName,
    openedAt: table.openedAt?.toISOString() ?? null,
    reservationName: table.reservationName,
    reservationTime: table.reservationTime,
    notes: table.notes,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  };
}

export function toDiningZoneDto(zone: DiningZoneWithTables): DiningZoneDto {
  return {
    id: zone.id,
    branchId: zone.branchId,
    name: zone.name,
    sortOrder: zone.sortOrder,
    isActive: zone.isActive,
    tables: zone.tables.map(toDiningTableDto),
    createdAt: zone.createdAt.toISOString(),
    updatedAt: zone.updatedAt.toISOString(),
  };
}
