import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DiningController } from './dining.controller';
import { DiningRepository } from './dining.repository';
import { DiningService } from './dining.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [DiningController],
  providers: [DiningService, DiningRepository],
})
export class OperationsModule {}
