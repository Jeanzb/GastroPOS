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
import type { CustomerDto, PaginatedResult } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get()
  list(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListCustomersQueryDto,
  ): Promise<PaginatedResult<CustomerDto>> {
    return this.service.list(ctx, query);
  }

  @Get(':id')
  getById(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<CustomerDto> {
    return this.service.getById(ctx, id);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER')
  create(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerDto> {
    return this.service.create(ctx, dto);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER')
  update(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerDto> {
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
