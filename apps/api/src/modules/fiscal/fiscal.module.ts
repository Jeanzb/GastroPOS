import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FiscalController } from './fiscal.controller';
import { FiscalRepository } from './fiscal.repository';
import { FiscalService } from './fiscal.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [FiscalController],
  providers: [FiscalService, FiscalRepository],
})
export class FiscalModule {}
