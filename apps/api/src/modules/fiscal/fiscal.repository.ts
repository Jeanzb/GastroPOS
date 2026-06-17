import { Injectable } from '@nestjs/common';
import {
  FiscalEnvironment,
  FiscalProviderStatus,
  FiscalProviderType,
  type FiscalProviderConfig,
} from '../../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { FiscalProfileWithProvider } from './fiscal.mapper';

export interface UpsertFiscalProviderConfigData {
  providerType: FiscalProviderType;
  providerName: string | null;
  environment: FiscalEnvironment;
  endpointUrl: string | null;
  softwareId: string | null;
  certificateAlias: string | null;
  accountId: string | null;
  apiKeyRef: string | null;
}

export interface UpsertFiscalProfileData {
  legalName: string;
  nit: string;
  taxRegime: string | null;
  fiscalResponsibilities: string[];
  municipality: string | null;
  address: string | null;
  invoiceResolutionNumber: string | null;
  invoiceResolutionPrefix: string | null;
  numberingRangeFrom: number | null;
  numberingRangeTo: number | null;
  numberingValidFrom: Date | null;
  numberingValidUntil: Date | null;
  isReady: boolean;
  actorUserId: string;
  providerConfig?: UpsertFiscalProviderConfigData;
}

@Injectable()
export class FiscalRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(tenantId: string): Promise<FiscalProfileWithProvider | null> {
    return this.prisma.fiscalProfile.findFirst({
      where: { tenantId },
      include: { providerConfig: true },
    });
  }

  async upsertProfile(
    tenantId: string,
    data: UpsertFiscalProfileData,
  ): Promise<FiscalProfileWithProvider> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.fiscalProfile.upsert({
        where: { tenantId },
        update: {
          legalName: data.legalName,
          nit: data.nit,
          taxRegime: data.taxRegime,
          fiscalResponsibilities: data.fiscalResponsibilities,
          municipality: data.municipality,
          address: data.address,
          invoiceResolutionNumber: data.invoiceResolutionNumber,
          invoiceResolutionPrefix: data.invoiceResolutionPrefix,
          numberingRangeFrom: data.numberingRangeFrom,
          numberingRangeTo: data.numberingRangeTo,
          numberingValidFrom: data.numberingValidFrom,
          numberingValidUntil: data.numberingValidUntil,
          isReady: data.isReady,
          updatedById: data.actorUserId,
        },
        create: {
          tenantId,
          legalName: data.legalName,
          nit: data.nit,
          taxRegime: data.taxRegime,
          fiscalResponsibilities: data.fiscalResponsibilities,
          municipality: data.municipality,
          address: data.address,
          invoiceResolutionNumber: data.invoiceResolutionNumber,
          invoiceResolutionPrefix: data.invoiceResolutionPrefix,
          numberingRangeFrom: data.numberingRangeFrom,
          numberingRangeTo: data.numberingRangeTo,
          numberingValidFrom: data.numberingValidFrom,
          numberingValidUntil: data.numberingValidUntil,
          isReady: data.isReady,
          createdById: data.actorUserId,
        },
      });

      if (data.providerConfig) {
        await tx.fiscalProviderConfig.upsert({
          where: { fiscalProfileId: profile.id },
          update: {
            ...data.providerConfig,
            status: FiscalProviderStatus.CONFIGURED,
            lastConnectionError: null,
            updatedById: data.actorUserId,
          },
          create: {
            tenantId,
            fiscalProfileId: profile.id,
            ...data.providerConfig,
            status: FiscalProviderStatus.CONFIGURED,
            createdById: data.actorUserId,
          },
        });
      }

      return tx.fiscalProfile.findFirstOrThrow({
        where: { id: profile.id, tenantId },
        include: { providerConfig: true },
      });
    });
  }

  async updateProviderConnectionResult(input: {
    tenantId: string;
    providerConfigId: string;
    status: FiscalProviderStatus;
    error: string | null;
    isReady: boolean;
    actorUserId: string;
    checkedAt: Date;
  }): Promise<FiscalProfileWithProvider | null> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.fiscalProviderConfig.updateMany({
        where: { id: input.providerConfigId, tenantId: input.tenantId },
        data: {
          status: input.status,
          lastConnectionError: input.error,
          lastConnectionTestAt: input.checkedAt,
          updatedById: input.actorUserId,
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      const provider = await tx.fiscalProviderConfig.findFirstOrThrow({
        where: { id: input.providerConfigId, tenantId: input.tenantId },
      });

      await tx.fiscalProfile.updateMany({
        where: { id: provider.fiscalProfileId, tenantId: input.tenantId },
        data: {
          isReady: input.isReady,
          updatedById: input.actorUserId,
        },
      });

      return tx.fiscalProfile.findFirstOrThrow({
        where: { id: provider.fiscalProfileId, tenantId: input.tenantId },
        include: { providerConfig: true },
      });
    });
  }
}

export type FiscalProviderConnectionConfig = FiscalProviderConfig;
