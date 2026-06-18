import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { DiningTableDto, DiningZoneDto } from '@gastroai/contracts';
import { CurrentActor } from '../auth/presentation/decorators/current-actor.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CreateDiningTableDto } from './dto/create-dining-table.dto';
import { CreateDiningZoneDto } from './dto/create-dining-zone.dto';
import { UpdateDiningTableStatusDto } from './dto/update-dining-table-status.dto';
import { UpdateDiningTableDto } from './dto/update-dining-table.dto';
import { UpdateDiningZoneDto } from './dto/update-dining-zone.dto';
import { DiningService } from './dining.service';
import type { OperationsActor } from './operations.types';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DiningController {
  constructor(private readonly service: DiningService) {}

  @Get('dining-zones')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN')
  listZones(@CurrentActor() actor: OperationsActor): Promise<DiningZoneDto[]> {
    return this.service.listZones(actor);
  }

  @Post('dining-zones')
  @RequireRoles('OWNER', 'ADMIN')
  createZone(
    @CurrentActor() actor: OperationsActor,
    @Body() dto: CreateDiningZoneDto,
  ): Promise<DiningZoneDto> {
    return this.service.createZone(actor, dto);
  }

  @Patch('dining-zones/:id')
  @RequireRoles('OWNER', 'ADMIN')
  updateZone(
    @CurrentActor() actor: OperationsActor,
    @Param('id') id: string,
    @Body() dto: UpdateDiningZoneDto,
  ): Promise<DiningZoneDto> {
    return this.service.updateZone(actor, id, dto);
  }

  @Post('dining-zones/:zoneId/tables')
  @RequireRoles('OWNER', 'ADMIN')
  createTable(
    @CurrentActor() actor: OperationsActor,
    @Param('zoneId') zoneId: string,
    @Body() dto: CreateDiningTableDto,
  ): Promise<DiningTableDto> {
    return this.service.createTable(actor, zoneId, dto);
  }

  @Delete('dining-zones/:id')
  @RequireRoles('OWNER', 'ADMIN')
  @HttpCode(204)
  deleteZone(@CurrentActor() actor: OperationsActor, @Param('id') id: string): Promise<void> {
    return this.service.deleteZone(actor, id);
  }

  @Patch('dining-tables/:id')
  @RequireRoles('OWNER', 'ADMIN')
  updateTable(
    @CurrentActor() actor: OperationsActor,
    @Param('id') id: string,
    @Body() dto: UpdateDiningTableDto,
  ): Promise<DiningTableDto> {
    return this.service.updateTable(actor, id, dto);
  }

  @Delete('dining-tables/:id')
  @RequireRoles('OWNER', 'ADMIN')
  @HttpCode(204)
  deleteTable(@CurrentActor() actor: OperationsActor, @Param('id') id: string): Promise<void> {
    return this.service.deleteTable(actor, id);
  }

  @Patch('dining-tables/:id/status')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER')
  updateTableStatus(
    @CurrentActor() actor: OperationsActor,
    @Param('id') id: string,
    @Body() dto: UpdateDiningTableStatusDto,
  ): Promise<DiningTableDto> {
    return this.service.updateTableStatus(actor, id, dto);
  }
}
