import type { AuditLogCreateData, RecordAuditLogInput } from './audit.types';

export function toAuditLogCreateData(
  input: RecordAuditLogInput,
): AuditLogCreateData {
  return {
    tenantId: optionalString(input.tenantId),
    branchId: optionalString(input.branchId),
    actorUserId: optionalString(input.actorUserId),
    action: input.action,
    entityType: input.entityType,
    entityId: optionalString(input.entityId),
    before: input.before,
    after: input.after,
    metadata: input.metadata,
    ipAddress: optionalString(input.ipAddress),
    userAgent: optionalString(input.userAgent),
    requestId: optionalString(input.requestId),
  };
}

function optionalString(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}
