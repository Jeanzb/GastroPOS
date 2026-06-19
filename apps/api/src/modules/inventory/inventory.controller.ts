import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { InventoryItemDto, PaginatedResult, StockMovementDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { ListInventoryItemsQueryDto } from './dto/list-inventory-items-query.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get('stock-movements')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'ACCOUNTANT')
  listMovements(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListStockMovementsQueryDto,
  ): Promise<PaginatedResult<StockMovementDto>> {
    return this.service.listMovements(ctx, query);
  }
}
