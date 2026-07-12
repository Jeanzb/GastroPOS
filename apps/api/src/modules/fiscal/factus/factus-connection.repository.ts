import { Injectable } from '@nestjs/common';
import {
  FactusConnectionStatus,
  FactusEnvironment,
  type BranchFiscalConfiguration,
  type FactusConnection,
} from '../../../../generated/prisma';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class FactusConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string): Promise<FactusConnection | null> {
    return this.prisma.factusConnection.findUnique({ where: { tenantId } });
  }

  upsert(input: {
    tenantId: string;
    environment: FactusEnvironment;
    baseUrl: string;
    encryptedCredentials: string;
    actorUserId: string;
  }): Promise<FactusConnection> {
    return this.prisma.factusConnection.upsert({
      where: { tenantId: input.tenantId },
      update: {
        environment: input.environment,
        baseUrl: input.baseUrl,
        encryptedCredentials: input.encryptedCredentials,
        status: FactusConnectionStatus.PENDING_VERIFICATION,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedById: input.actorUserId,
      },
      create: {
        tenantId: input.tenantId,
        environment: input.environment,
        baseUrl: input.baseUrl,
        encryptedCredentials: input.encryptedCredentials,
        status: FactusConnectionStatus.PENDING_VERIFICATION,
        createdById: input.actorUserId,
      },
    });
  }

  updateHealth(input: {
    tenantId: string;
    status: FactusConnectionStatus;
    latencyMs?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<FactusConnection> {
    return this.prisma.factusConnection.update({
      where: { tenantId: input.tenantId },
      data: {
        status: input.status,
        lastVerifiedAt: new Date(),
        lastLatencyMs: input.latencyMs ?? null,
        lastErrorCode: input.errorCode ?? null,
        lastErrorMessage: input.errorMessage ?? null,
      },
    });
  }

  findBranchConfiguration(
    tenantId: string,
    branchId: string,
  ): Promise<BranchFiscalConfiguration | null> {
    return this.prisma.branchFiscalConfiguration.findFirst({
      where: { tenantId, branchId },
    });
  }

  async isActiveBranch(tenantId: string, branchId: string): Promise<boolean> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    return Boolean(branch);
  }

  upsertBranchConfiguration(input: {
    tenantId: string;
    branchId: string;
    actorUserId: string;
    data: BranchFiscalConfigurationData;
  }): Promise<BranchFiscalConfiguration> {
    return this.prisma.branchFiscalConfiguration.upsert({
      where: { branchId: input.branchId },
      update: {
        ...input.data,
        updatedById: input.actorUserId,
      },
      create: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        ...input.data,
        createdById: input.actorUserId,
      },
    });
  }
}

export interface BranchFiscalConfigurationData {
  establishmentName: string | null;
  establishmentCode: string | null;
  establishmentAddress: string | null;
  establishmentMunicipality: string | null;
  establishmentPhone: string | null;
  invoiceNumberingRangeId: number | null;
  creditNoteNumberingRangeId: number | null;
  supportNumberingRangeId: number | null;
  adjustmentNumberingRangeId: number | null;
  isEnabled: boolean;
}
