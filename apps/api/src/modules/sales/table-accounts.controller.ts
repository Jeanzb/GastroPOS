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
import type { KitchenCommandDto, ReceiptDto, TableAccountDto } from '@gastroai/contracts';
import { CurrentActor } from '../auth/presentation/decorators/current-actor.decorator';
import { RequireRoles } from '../auth/presentation/decorators/require-roles.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import type { OperationsActor } from '../operations/operations.types';
import { AddTableAccountItemDto } from './dto/add-table-account-item.dto';
import { ChargeTableAccountDto } from './dto/charge-table-account.dto';
import { OpenTableAccountDto } from './dto/open-table-account.dto';
import { UpdateTableAccountItemDto } from './dto/update-table-account-item.dto';
import { TableAccountsService } from './table-accounts.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TableAccountsController {
  constructor(private readonly service: TableAccountsService) {}

  @Get('dining-tables/:tableId/account')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN')
  getCurrentAccount(
    @CurrentActor() actor: OperationsActor,
    @Param('tableId') tableId: string,
  ): Promise<TableAccountDto | null> {
    return this.service.getCurrentAccount(actor, tableId);
  }

  @Post('dining-tables/:tableId/account')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER')
  openAccount(
    @CurrentActor() actor: OperationsActor,
    @Param('tableId') tableId: string,
    @Body() dto: OpenTableAccountDto,
  ): Promise<TableAccountDto> {
    return this.service.openAccount(actor, tableId, dto);
  }

  @Post('table-accounts/:saleId/items')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER')
  addItem(
    @CurrentActor() actor: OperationsActor,
    @Param('saleId') saleId: string,
    @Body() dto: AddTableAccountItemDto,
  ): Promise<TableAccountDto> {
    return this.service.addItem(actor, saleId, dto);
  }

  @Patch('table-accounts/:saleId/items/:itemId')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER')
  updateItem(
    @CurrentActor() actor: OperationsActor,
    @Param('saleId') saleId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTableAccountItemDto,
  ): Promise<TableAccountDto> {
    return this.service.updateItem(actor, saleId, itemId, dto);
  }

  @Delete('table-accounts/:saleId/items/:itemId')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER')
  @HttpCode(200)
  removeItem(
    @CurrentActor() actor: OperationsActor,
    @Param('saleId') saleId: string,
    @Param('itemId') itemId: string,
  ): Promise<TableAccountDto> {
    return this.service.removeItem(actor, saleId, itemId);
  }

  @Get('table-accounts/:saleId/command')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN')
  getCommand(
    @CurrentActor() actor: OperationsActor,
    @Param('saleId') saleId: string,
  ): Promise<KitchenCommandDto> {
    return this.service.getCommand(actor, saleId);
  }

  @Get('table-accounts/:saleId/receipt')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER')
  getReceipt(
    @CurrentActor() actor: OperationsActor,
    @Param('saleId') saleId: string,
  ): Promise<ReceiptDto> {
    return this.service.getReceipt(actor, saleId);
  }

  @Post('table-accounts/:saleId/charge')
  @RequireRoles('OWNER', 'ADMIN', 'CASHIER')
  chargeAccount(
    @CurrentActor() actor: OperationsActor,
    @Param('saleId') saleId: string,
    @Body() dto: ChargeTableAccountDto,
  ): Promise<ReceiptDto> {
    return this.service.chargeAccount(actor, saleId, dto);
  }
}
