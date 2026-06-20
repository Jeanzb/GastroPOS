import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { FiscalProfileDto, FiscalProviderConnectionTestDto } from '@gastroai/contracts';
import { CurrentActor } from '../auth/presentation/decorators/current-actor.decorator';
import { RequireFeature } from '../auth/presentation/decorators/require-feature.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { FeatureGuard } from '../auth/presentation/guards/feature.guard';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TenantStatusGuard } from '../auth/presentation/guards/tenant-status.guard';
import { UpsertFiscalProfileDto } from './dto/upsert-fiscal-profile.dto';
import { FiscalService } from './fiscal.service';
import type { FiscalActor } from './fiscal.types';

@ApiTags('fiscal')
@ApiBearerAuth()
@RequireFeature('dian.enabled')
@UseGuards(JwtAuthGuard, TenantStatusGuard, FeatureGuard, RolesGuard)
@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('profile')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Tenant fiscal profile, when configured.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  getProfile(@CurrentActor() actor: FiscalActor): Promise<FiscalProfileDto | null> {
    return this.fiscalService.getProfile(actor);
  }

  @Put('profile')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Created or updated fiscal profile.' })
  upsertProfile(
    @CurrentActor() actor: FiscalActor,
    @Body() dto: UpsertFiscalProfileDto,
  ): Promise<FiscalProfileDto> {
    return this.fiscalService.upsertProfile(actor, dto);
  }

  @Post('provider/test-connection')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Provider readiness validation result.' })
  testProviderConnection(
    @CurrentActor() actor: FiscalActor,
  ): Promise<FiscalProviderConnectionTestDto> {
    return this.fiscalService.testProviderConnection(actor);
  }
}
