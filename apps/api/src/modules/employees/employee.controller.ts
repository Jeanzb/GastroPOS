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
import type { EmployeeDto, PaginatedResult } from '@gastroai/contracts';
import type { TenantRequestContext } from '../auth/auth.types';
import { CurrentTenantContext } from '../auth/presentation/decorators/current-tenant-context.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeAccessDto } from './dto/update-employee-access.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeService } from './employee.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('OWNER', 'ADMIN')
@Controller('employees')
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Get()
  list(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Query() query: ListEmployeesQueryDto,
  ): Promise<PaginatedResult<EmployeeDto>> {
    return this.service.list(ctx, query);
  }

  @Get(':id')
  getById(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<EmployeeDto> {
    return this.service.getById(ctx, id);
  }

  @Post()
  create(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Body() dto: CreateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.service.create(ctx, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.service.update(ctx, id, dto);
  }

  @Patch(':id/access')
  updateAccess(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeAccessDto,
  ): Promise<EmployeeDto> {
    return this.service.updateAccess(ctx, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(ctx, id);
  }
}
