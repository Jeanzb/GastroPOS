import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult, SupplierDto } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly service: SupplierService) {}

  @Get()
  list(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListSuppliersQueryDto,
  ): Promise<PaginatedResult<SupplierDto>> {
    return this.service.list(ctx, query);
  }

  @Get(':id')
  getById(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<SupplierDto> {
    return this.service.getById(ctx, id);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  create(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Body() dto: CreateSupplierDto,
  ): Promise<SupplierDto> {
    return this.service.create(ctx, dto);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  update(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierDto> {
    return this.service.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(ctx, id);
  }
}
