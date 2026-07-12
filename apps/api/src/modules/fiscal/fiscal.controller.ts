import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type {
  FiscalCreditNoteActionDto,
  FiscalDocumentActionDto,
  FiscalDocumentDetailDto,
  FiscalDocumentListDto,
  FiscalNumberingRangeListDto,
  FiscalProfileDto,
} from '@gastroai/contracts';
import { CurrentActor } from '../auth/presentation/decorators/current-actor.decorator';
import { RequireFeature } from '../auth/presentation/decorators/require-feature.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { FeatureGuard } from '../auth/presentation/guards/feature.guard';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TenantStatusGuard } from '../auth/presentation/guards/tenant-status.guard';
import { CreditNoteWorkflowService } from './credit-note-workflow.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { ListFiscalDocumentsQueryDto } from './dto/list-fiscal-documents-query.dto';
import { UpsertFiscalProfileDto } from './dto/upsert-fiscal-profile.dto';
import { LookupFactusAcquirerQueryDto } from './dto/lookup-factus-acquirer-query.dto';
import { UpsertBranchFiscalConfigurationDto } from './dto/upsert-branch-fiscal-configuration.dto';
import { UpsertFactusConnectionDto } from './dto/upsert-factus-connection.dto';
import { FiscalService } from './fiscal.service';
import type { FiscalActor } from './fiscal.types';

@ApiTags('fiscal')
@ApiBearerAuth()
@RequireFeature('dian.enabled')
@UseGuards(JwtAuthGuard, TenantStatusGuard, FeatureGuard, RolesGuard)
@Controller('fiscal')
export class FiscalController {
  constructor(
    private readonly fiscalService: FiscalService,
    private readonly creditNoteWorkflow: CreditNoteWorkflowService,
  ) {}

  @Get('profile')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Tenant fiscal profile, when configured.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  getProfile(@CurrentActor() actor: FiscalActor): Promise<FiscalProfileDto | null> {
    return this.fiscalService.getProfile(actor);
  }

  @Get('connection')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  getConnection(@CurrentActor() actor: FiscalActor) {
    return this.fiscalService.getFactusConnection(actor);
  }

  @Put('connection')
  @RequireRoles('OWNER', 'ADMIN')
  configureConnection(
    @CurrentActor() actor: FiscalActor,
    @Body() dto: UpsertFactusConnectionDto,
  ) {
    return this.fiscalService.configureFactusConnection(actor, dto);
  }

  @Post('connection/verify')
  @RequireRoles('OWNER', 'ADMIN')
  verifyConnection(@CurrentActor() actor: FiscalActor) {
    return this.fiscalService.verifyFactusConnection(actor);
  }

  @Get('branch-configuration')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  getBranchConfiguration(@CurrentActor() actor: FiscalActor) {
    return this.fiscalService.getBranchFiscalConfiguration(actor);
  }

  @Put('branch-configuration')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  upsertBranchConfiguration(
    @CurrentActor() actor: FiscalActor,
    @Body() dto: UpsertBranchFiscalConfigurationDto,
  ) {
    return this.fiscalService.upsertBranchFiscalConfiguration(actor, dto);
  }

  @Get('acquirer')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT', 'CASHIER')
  lookupAcquirer(
    @CurrentActor() actor: FiscalActor,
    @Query() query: LookupFactusAcquirerQueryDto,
  ) {
    return this.fiscalService.lookupAcquirer(actor, query);
  }

  @Put('profile')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Created or updated tenant fiscal profile.' })
  upsertProfile(
    @CurrentActor() actor: FiscalActor,
    @Body() dto: UpsertFiscalProfileDto,
  ): Promise<FiscalProfileDto> {
    return this.fiscalService.upsertProfile(actor, dto);
  }

  @Get('numbering-ranges')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'DIAN numbering ranges available to the current tenant.' })
  listNumberingRanges(@CurrentActor() actor: FiscalActor): Promise<FiscalNumberingRangeListDto> {
    return this.fiscalService.listNumberingRanges(actor);
  }

  @Get('documents')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Fiscal document monitor for the active branch.' })
  listDocuments(
    @CurrentActor() actor: FiscalActor,
    @Query() query: ListFiscalDocumentsQueryDto,
  ): Promise<FiscalDocumentListDto> {
    return this.fiscalService.listDocuments(actor, query);
  }

  @Get('documents/:id')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Fiscal document detail for the active branch.' })
  getDocumentDetail(
    @CurrentActor() actor: FiscalActor,
    @Param('id') invoiceId: string,
  ): Promise<FiscalDocumentDetailDto> {
    return this.fiscalService.getDocumentDetail(actor, invoiceId);
  }

  @Post('documents/:id/retry')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Fiscal document queued for retry in the active branch.' })
  retryDocument(
    @CurrentActor() actor: FiscalActor,
    @Param('id') invoiceId: string,
  ): Promise<FiscalDocumentActionDto> {
    return this.fiscalService.retryDocument(actor, invoiceId);
  }

  @Post('documents/:id/download-artifacts')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Fiscal document artifacts queued for the active branch.' })
  downloadArtifacts(
    @CurrentActor() actor: FiscalActor,
    @Param('id') invoiceId: string,
  ): Promise<FiscalDocumentActionDto> {
    return this.fiscalService.requestArtifactDownload(actor, invoiceId);
  }

  @Post('documents/:id/credit-notes')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({
    description: 'Credit note queued from an accepted document in the active branch.',
  })
  createCreditNote(
    @CurrentActor() actor: FiscalActor,
    @Param('id') invoiceId: string,
    @Body() dto: CreateCreditNoteDto,
  ): Promise<FiscalCreditNoteActionDto> {
    return this.creditNoteWorkflow.createCreditNote(actor, invoiceId, dto);
  }
}
