import { Injectable } from '@nestjs/common';
import type {
  FiscalDocumentActionDto,
  FiscalDocumentDetailDto,
  FiscalDocumentListDto,
  FiscalNumberingRangeListDto,
  FiscalProfileDto,
} from '@gastroai/contracts';
import { ApplicationException } from '../../common/errors/application.exception';
import { AuditService } from '../audit/audit.service';
import type { ListFiscalDocumentsQueryDto } from './dto/list-fiscal-documents-query.dto';
import type { UpsertFiscalProfileDto } from './dto/upsert-fiscal-profile.dto';
import type { LookupFactusAcquirerQueryDto } from './dto/lookup-factus-acquirer-query.dto';
import type { UpsertBranchFiscalConfigurationDto } from './dto/upsert-branch-fiscal-configuration.dto';
import type { UpsertFactusConnectionDto } from './dto/upsert-factus-connection.dto';
import { FactusAdapter } from './factus/factus.adapter';
import {
  FactusConnectionService,
  type BranchFiscalConfigurationDto,
  type FactusConnectionDto,
} from './factus/factus-connection.service';
import { parseFactusNumberingRanges } from './factus/factus.mapper';
import { FiscalDocumentWorkflowService } from './fiscal-document-workflow.service';
import { toFiscalProfileDto, type FiscalProfileRecord } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import type { UpsertFiscalProfileData } from './fiscal.repository';
import type { FiscalActor } from './fiscal.types';
import { asJson, auditBase } from './fiscal.utils';

@Injectable()
export class FiscalService {
  constructor(
    private readonly repository: FiscalRepository,
    private readonly auditService: AuditService,
    private readonly factusAdapter: FactusAdapter,
    private readonly factusConnection: FactusConnectionService,
    private readonly documents: FiscalDocumentWorkflowService,
  ) {}

  async getProfile(actor: FiscalActor): Promise<FiscalProfileDto | null> {
    const profile = await this.repository.findProfile(actor.tenantId);
    return profile ? toFiscalProfileDto(profile) : null;
  }

  async upsertProfile(actor: FiscalActor, dto: UpsertFiscalProfileDto): Promise<FiscalProfileDto> {
    assertValidNumberingRange(dto);
    assertValidNumberingDates(dto);
    const existing = await this.repository.findProfile(actor.tenantId);
    const before = existing ? toFiscalProfileDto(existing) : null;
    const data = toProfileData(actor, dto);

    const saved = await this.repository.upsertProfile(actor.tenantId, data);
    const after = toFiscalProfileDto(saved);

    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: existing ? 'FISCAL_PROFILE_UPDATED' : 'FISCAL_PROFILE_CREATED',
      entityType: 'FiscalProfile',
      entityId: saved.id,
      before: before ? asJson(before) : undefined,
      after: asJson(after),
    });

    return after;
  }

  listDocuments(
    actor: FiscalActor,
    query: ListFiscalDocumentsQueryDto,
  ): Promise<FiscalDocumentListDto> {
    return this.documents.listDocuments(actor, query);
  }

  getDocumentDetail(actor: FiscalActor, invoiceId: string): Promise<FiscalDocumentDetailDto> {
    return this.documents.getDocumentDetail(actor, invoiceId);
  }

  async listNumberingRanges(actor: FiscalActor): Promise<FiscalNumberingRangeListDto> {
    const profile = await this.repository.findProfile(actor.tenantId);
    if (!profile) {
      throw new ApplicationException(409, {
        code: 'FISCAL_PROFILE_NOT_CONFIGURED',
        message: 'Configura primero los datos tributarios del restaurante para sincronizar rangos.',
      });
    }
    const runtime = await this.factusConnection.getRuntime(actor.tenantId);
    const result = await this.factusAdapter.listDianNumberingRanges(runtime);
    const items = parseFactusNumberingRanges(result.payload);
    const fetchedAt = new Date().toISOString();

    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'FISCAL_NUMBERING_RANGES_SYNCED',
      entityType: 'FiscalProfile',
      entityId: profile.id,
      metadata: asJson({ itemCount: items.length, endpoint: result.endpoint }),
    });

    return { items, fetchedAt };
  }

  getFactusConnection(actor: FiscalActor): Promise<FactusConnectionDto | null> {
    return this.factusConnection.getConnection(actor.tenantId);
  }

  async configureFactusConnection(
    actor: FiscalActor,
    dto: UpsertFactusConnectionDto,
  ): Promise<FactusConnectionDto> {
    const saved = await this.factusConnection.configure(actor.tenantId, actor.actorUserId, dto);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'FACTUS_CONNECTION_CONFIGURED',
      entityType: 'FactusConnection',
      entityId: actor.tenantId,
      after: asJson({ environment: saved.environment, baseUrl: saved.baseUrl, status: saved.status }),
    });
    return saved;
  }

  async verifyFactusConnection(actor: FiscalActor): Promise<FactusConnectionDto> {
    const verified = await this.factusConnection.verify(actor.tenantId);
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'FACTUS_CONNECTION_VERIFIED',
      entityType: 'FactusConnection',
      entityId: actor.tenantId,
      after: asJson({ status: verified.status, latencyMs: verified.lastLatencyMs }),
    });
    return verified;
  }

  getBranchFiscalConfiguration(actor: FiscalActor): Promise<BranchFiscalConfigurationDto | null> {
    const branchId = actor.branchId;
    if (!branchId) {
      throw new ApplicationException(400, {
        code: 'BRANCH_CONTEXT_REQUIRED',
        message: 'Selecciona una sede antes de consultar su configuracion fiscal.',
      });
    }
    return this.factusConnection.getBranchConfiguration(actor.tenantId, branchId);
  }

  async upsertBranchFiscalConfiguration(
    actor: FiscalActor,
    dto: UpsertBranchFiscalConfigurationDto,
  ): Promise<BranchFiscalConfigurationDto> {
    const branchId = actor.branchId;
    if (!branchId) {
      throw new ApplicationException(400, {
        code: 'BRANCH_CONTEXT_REQUIRED',
        message: 'Selecciona una sede antes de configurar su rango fiscal.',
      });
    }
    const saved = await this.factusConnection.upsertBranchConfiguration(
      actor.tenantId,
      branchId,
      actor.actorUserId,
      dto,
    );
    await this.auditService.tryRecord({
      ...auditBase(actor),
      action: 'BRANCH_FISCAL_CONFIGURATION_UPDATED',
      entityType: 'BranchFiscalConfiguration',
      entityId: branchId,
      after: asJson(saved),
    });
    return saved;
  }

  async lookupAcquirer(
    actor: FiscalActor,
    query: LookupFactusAcquirerQueryDto,
  ): Promise<{ data: unknown }> {
    const runtime = await this.factusConnection.getRuntime(actor.tenantId);
    const result = await this.factusAdapter.lookupAcquirer(
      runtime,
      query.identificationDocumentCode,
      query.identificationNumber,
    );
    return { data: result.payload };
  }

  retryDocument(actor: FiscalActor, invoiceId: string): Promise<FiscalDocumentActionDto> {
    return this.documents.retryDocument(actor, invoiceId);
  }

  requestArtifactDownload(actor: FiscalActor, invoiceId: string): Promise<FiscalDocumentActionDto> {
    return this.documents.requestArtifactDownload(actor, invoiceId);
  }

  tryScheduleInvoiceIssue(actor: FiscalActor, invoiceId: string): Promise<void> {
    return this.documents.tryScheduleInvoiceIssue(actor, invoiceId);
  }
}

function toProfileData(actor: FiscalActor, dto: UpsertFiscalProfileDto): UpsertFiscalProfileData {
  return {
    legalName: dto.legalName.trim(),
    nit: dto.nit.trim(),
    taxRegime: normalizeOptional(dto.taxRegime),
    fiscalResponsibilities: normalizeResponsibilities(dto.fiscalResponsibilities),
    municipality: normalizeOptional(dto.municipality),
    address: normalizeOptional(dto.address),
    invoiceResolutionNumber: normalizeOptional(dto.invoiceResolutionNumber),
    invoiceResolutionPrefix: normalizeOptional(dto.invoiceResolutionPrefix),
    numberingRangeFrom: dto.numberingRangeFrom ?? null,
    numberingRangeTo: dto.numberingRangeTo ?? null,
    numberingValidFrom: toDateOrNull(dto.numberingValidFrom),
    numberingValidUntil: toDateOrNull(dto.numberingValidUntil),
    numberingRangeId: dto.numberingRangeId ?? null,
    creditNoteNumberingRangeId: dto.creditNoteNumberingRangeId ?? null,
    isReady: hasRequiredFiscalProfileInput(dto),
    actorUserId: actor.actorUserId,
  };
}
function hasRequiredFiscalProfileInput(dto: UpsertFiscalProfileDto): boolean {
  return Boolean(
    hasText(dto.legalName) &&
    hasText(dto.nit) &&
    hasText(dto.invoiceResolutionNumber) &&
    hasText(dto.invoiceResolutionPrefix) &&
    dto.numberingRangeFrom &&
    dto.numberingRangeTo &&
    dto.numberingRangeId,
  );
}

function assertValidNumberingRange(dto: UpsertFiscalProfileDto): void {
  if (
    dto.numberingRangeFrom !== undefined &&
    dto.numberingRangeTo !== undefined &&
    dto.numberingRangeFrom > dto.numberingRangeTo
  ) {
    throw new ApplicationException(400, {
      code: 'INVALID_NUMBERING_RANGE',
      message: 'Invoice numbering range start must be lower than or equal to end.',
    });
  }
}

function assertValidNumberingDates(dto: UpsertFiscalProfileDto): void {
  const from = toDateOrNull(dto.numberingValidFrom);
  const until = toDateOrNull(dto.numberingValidUntil);
  if (from && until && from.getTime() > until.getTime()) {
    throw new ApplicationException(400, {
      code: 'INVALID_NUMBERING_DATES',
      message: 'Invoice resolution start date must be before the end date.',
    });
  }
}

function normalizeResponsibilities(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function normalizeOptional(value: string | undefined): string | null {
  return value?.trim() || null;
}

function toDateOrNull(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
