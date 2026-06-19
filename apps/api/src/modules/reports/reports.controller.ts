import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { SalesSummaryDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { SalesSummaryQueryDto } from './dto/sales-summary-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  @RequireRoles('OWNER', 'ADMIN', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Aggregated sales summary for a date range.' })
  getSalesSummary(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: SalesSummaryQueryDto,
  ): Promise<SalesSummaryDto> {
    return this.reportsService.getSalesSummary(ctx, query);
  }
}
