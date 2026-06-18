import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CashMovementDto, CashSessionDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CashService } from './cash.service';
import { ActiveCashSessionQueryDto } from './dto/active-cash-session-query.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { RegisterCashMovementDto } from './dto/register-cash-movement.dto';

@ApiTags('cash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-sessions')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('active')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Open cash session for the selected branch.' })
  getActive(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ActiveCashSessionQueryDto,
  ): Promise<CashSessionDto> {
    return this.cashService.getActiveSession(ctx, query.branchId);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER')
  @ApiOkResponse({ description: 'Open a new cash session.' })
  open(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Body() dto: OpenCashSessionDto,
  ): Promise<CashSessionDto> {
    return this.cashService.openSession(ctx, dto);
  }

  @Get(':id/movements')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'ACCOUNTANT')
  @ApiOkResponse({ description: 'Cash movements for a session.' })
  listMovements(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<CashMovementDto[]> {
    return this.cashService.listMovements(ctx, id);
  }

  @Post(':id/movements')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER')
  @ApiOkResponse({ description: 'Register a cash movement.' })
  registerMovement(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: RegisterCashMovementDto,
  ): Promise<CashMovementDto> {
    return this.cashService.registerMovement(ctx, id, dto);
  }

  @Post(':id/close')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER')
  @ApiOkResponse({ description: 'Close a cash session with counted cash.' })
  close(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
  ): Promise<CashSessionDto> {
    return this.cashService.closeSession(ctx, id, dto);
  }
}
