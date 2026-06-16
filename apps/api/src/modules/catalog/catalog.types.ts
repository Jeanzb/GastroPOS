/** Who is performing a catalog action, plus request metadata for auditing. */
export interface CatalogActor {
  tenantId: string;
  branchId: string | null;
  actorUserId: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}
