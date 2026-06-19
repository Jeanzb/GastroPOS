import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult, PurchaseDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ListPurchasesQueryDto } from './dto/list-purchases-query.dto';
import { PurchaseService } from './purchase.service';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @Get()
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT')
  list(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListPurchasesQueryDto,
  ): Promise<PaginatedResult<PurchaseDto>> {
    return this.service.list(ctx, query);
  }

  @Get(':id')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT')
  getById(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<PurchaseDto> {
    return this.service.getById(ctx, id);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  create(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Body() dto: CreatePurchaseDto,
  ): Promise<PurchaseDto> {
    return this.service.create(ctx, dto);
  }

  @Patch(':id/receive')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  receive(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<PurchaseDto> {
    return this.service.receive(ctx, id);
  }

  @Patch(':id/cancel')
  @RequireRoles('OWNER', 'ADMIN')
  cancel(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<PurchaseDto> {
    return this.service.cancel(ctx, id);
  }
}
