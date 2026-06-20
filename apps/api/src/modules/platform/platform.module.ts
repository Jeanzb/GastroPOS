import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformController } from './platform.controller';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';

@Module({
  imports: [AuditModule, AuthModule, JwtModule.register({})],
  controllers: [PlatformController],
  providers: [PlatformRepository, PlatformService, PlatformJwtAuthGuard, PlatformRolesGuard],
  exports: [PlatformRepository, PlatformService, PlatformJwtAuthGuard, PlatformRolesGuard],
})
export class PlatformModule {}
