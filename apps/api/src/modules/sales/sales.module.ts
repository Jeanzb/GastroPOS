import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TableAccountsController } from './table-accounts.controller';
import { TableAccountsRepository } from './table-accounts.repository';
import { TableAccountsService } from './table-accounts.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TableAccountsController],
  providers: [TableAccountsService, TableAccountsRepository],
})
export class SalesModule {}
