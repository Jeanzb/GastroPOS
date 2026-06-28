import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyController } from './tenancy.controller';
import { TenancyRepository } from './tenancy.repository';
import { TenancyService } from './tenancy.service';

@Module({
  imports: [AuthModule],
  controllers: [TenancyController],
  providers: [TenancyRepository, TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
