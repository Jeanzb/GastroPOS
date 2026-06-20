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
import { RequireFeature } from '../auth/presentation/decorators/require-feature.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { FeatureGuard } from '../auth/presentation/guards/feature.guard';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TenantStatusGuard } from '../auth/presentation/guards/tenant-status.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { SetEmployeePinDto } from './dto/set-employee-pin.dto';
import { UpdateEmployeeAccessDto } from './dto/update-employee-access.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeService } from './employee.service';

@ApiTags('employees')
@ApiBearerAuth()
@RequireFeature('employees.enabled')
@UseGuards(JwtAuthGuard, TenantStatusGuard, FeatureGuard, RolesGuard)
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

  @Patch(':id/pin')
  setPin(
    @CurrentTenantContext() ctx: TenantRequestContext,
    @Param('id') id: string,
    @Body() dto: SetEmployeePinDto,
  ): Promise<EmployeeDto> {
    return this.service.setPin(ctx, id, dto.pin);
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
