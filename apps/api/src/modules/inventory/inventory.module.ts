import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { InventoryController } from './inventory.controller';
import { InventoryConsumptionService } from './inventory-consumption.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, InventoryConsumptionService],
  exports: [InventoryService, InventoryConsumptionService],
})
export class InventoryModule {}
