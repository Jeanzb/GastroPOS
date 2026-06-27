import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  PlatformAuthResponse,
  PlatformOverviewDto,
  PlatformFeatureDto,
  PlatformHealthDto,
  PlatformTenantDetailDto,
  PlatformTenantDto,
  PlanDto,
  TenantFeatureOverrideDto,
} from '@gastroai/contracts';
import { PlatformService } from './platform.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformRefreshTokenDto } from './dto/platform-refresh-token.dto';
import { CreatePlatformTenantDto } from './dto/create-platform-tenant.dto';
import { CreatePlatformBranchDto } from './dto/create-platform-branch.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { UpdateTenantFeatureOverrideDto } from './dto/update-tenant-feature-override.dto';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';
import { CurrentPlatformUser } from './decorators/current-platform-user.decorator';
import { RequirePlatformRoles } from './decorators/require-platform-roles.decorator';
import type { AuthenticatedPlatformUser, PlatformAuthRequestMetadata } from './platform.types';

interface RequestMetadataSource {
  ip?: string;
  requestId?: string;
}

@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Authenticated platform user and token pair.' })
  login(
    @Body() dto: PlatformLoginDto,
    @Req() request: RequestMetadataSource,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<PlatformAuthResponse> {
    return this.platformService.login({
      email: dto.email,
      password: dto.password,
      metadata: requestMetadata(request, userAgent, forwardedFor),
    });
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: PlatformRefreshTokenDto,
    @Req() request: RequestMetadataSource,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<PlatformAuthResponse> {
    return this.platformService.refresh({
      refreshToken: dto.refreshToken,
      metadata: requestMetadata(request, userAgent, forwardedFor),
    });
  }

  @Post('auth/logout')
  @UseGuards(PlatformJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logout(@CurrentPlatformUser() user: AuthenticatedPlatformUser): Promise<void> {
    await this.platformService.logout(user);
  }

  @Get('overview')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  getOverview(): Promise<PlatformOverviewDto> {
    return this.platformService.getOverview();
  }

  @Get('tenants')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  listTenants(): Promise<PlatformTenantDto[]> {
    return this.platformService.listTenants();
  }

  @Post('tenants')
  @UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  createTenant(
    @CurrentPlatformUser() user: AuthenticatedPlatformUser,
    @Body() dto: CreatePlatformTenantDto,
  ): Promise<PlatformTenantDetailDto> {
    return this.platformService.createTenant(user, dto);
  }

  @Post('tenants/:id/branches')
  @UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  createBranch(
    @CurrentPlatformUser() user: AuthenticatedPlatformUser,
    @Param('id') id: string,
    @Body() dto: CreatePlatformBranchDto,
  ): Promise<PlatformTenantDetailDto> {
    return this.platformService.createBranch(user, id, dto);
  }

  @Get('tenants/:id')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  getTenant(@Param('id') id: string): Promise<PlatformTenantDetailDto> {
    return this.platformService.getTenant(id);
  }

  @Patch('tenants/:id/status')
  @UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  updateTenantStatus(
    @CurrentPlatformUser() user: AuthenticatedPlatformUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ): Promise<PlatformTenantDetailDto> {
    return this.platformService.updateTenantStatus(user, id, dto.status, dto.suspensionReason);
  }

  @Patch('tenants/:id/plan')
  @UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  updateTenantPlan(
    @CurrentPlatformUser() user: AuthenticatedPlatformUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantPlanDto,
  ): Promise<PlatformTenantDetailDto> {
    return this.platformService.updateTenantPlan(user, id, dto.planCode);
  }

  @Get('plans')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  listPlans(): Promise<PlanDto[]> {
    return this.platformService.listPlans();
  }

  @Get('features')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  listFeatures(): Promise<PlatformFeatureDto[]> {
    return this.platformService.listFeatures();
  }

  @Get('health')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  getHealth(): Promise<PlatformHealthDto> {
    return this.platformService.getHealth();
  }

  @Get('tenants/:id/features')
  @UseGuards(PlatformJwtAuthGuard)
  @ApiBearerAuth()
  listTenantFeatures(@Param('id') id: string): Promise<TenantFeatureOverrideDto[]> {
    return this.platformService.listTenantFeatures(id);
  }

  @Patch('tenants/:id/features/:featureCode')
  @UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  updateTenantFeatureOverride(
    @CurrentPlatformUser() user: AuthenticatedPlatformUser,
    @Param('id') id: string,
    @Param('featureCode') featureCode: string,
    @Body() dto: UpdateTenantFeatureOverrideDto,
  ): Promise<TenantFeatureOverrideDto[]> {
    return this.platformService.updateTenantFeatureOverride(user, id, featureCode, dto);
  }

  @Delete('tenants/:id/features/:featureCode')
  @UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  deleteTenantFeatureOverride(
    @CurrentPlatformUser() user: AuthenticatedPlatformUser,
    @Param('id') id: string,
    @Param('featureCode') featureCode: string,
  ): Promise<TenantFeatureOverrideDto[]> {
    return this.platformService.deleteTenantFeatureOverride(user, id, featureCode);
  }
}

function requestMetadata(
  request: RequestMetadataSource,
  userAgent: string | undefined,
  forwardedFor: string | undefined,
): PlatformAuthRequestMetadata {
  return {
    requestId: request.requestId,
    userAgent,
    ipAddress: firstForwardedIp(forwardedFor) ?? request.ip,
  };
}

function firstForwardedIp(value: string | undefined): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}
