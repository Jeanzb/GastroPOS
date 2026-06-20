import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { InventoryItemDto, PaginatedResult, StockMovementDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireFeature } from '../auth/presentation/decorators/require-feature.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { FeatureGuard } from '../auth/presentation/guards/feature.guard';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TenantStatusGuard } from '../auth/presentation/guards/tenant-status.guard';
import { AdjustInventoryStockDto } from './dto/adjust-inventory-stock.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@RequireFeature('inventory.enabled')
@UseGuards(JwtAuthGuard, TenantStatusGuard, FeatureGuard, RolesGuard)
@Controller()
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('inventory-items')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT')
  listItems(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListInventoryItemsQueryDto,
  ): Promise<PaginatedResult<InventoryItemDto>> {
    return this.service.listItems(ctx, query);
  }

  @Post('inventory-items')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  createItem(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Body() body: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.service.createItem(ctx, body);
  }

  @Patch('inventory-items/:id')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  updateItem(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() body: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.service.updateItem(ctx, id, body);
  }

  @Post('inventory-items/:id/adjustments')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  adjustStock(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() body: AdjustInventoryStockDto,
  ): Promise<InventoryItemDto> {
    return this.service.adjustStock(ctx, id, body);
  }

  @Get('stock-movements')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT')
  listMovements(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListStockMovementsQueryDto,
  ): Promise<PaginatedResult<StockMovementDto>> {
    return this.service.listMovements(ctx, query);
  }
}
