import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { BranchDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../auth/presentation/guards/tenant-status.guard';
import { TenancyService } from './tenancy.service';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantStatusGuard)
@Controller('branches')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get()
  @ApiOkResponse({ description: 'Active branches visible to the authenticated tenant user.' })
  listBranches(@CurrentTenantContext() ctx: TenantRequestContext): Promise<BranchDto[]> {
    return this.tenancyService.listBranches(ctx);
  }
}
