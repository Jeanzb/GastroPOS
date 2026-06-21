import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { PasswordHashingService } from './application/password-hashing.service';
import { SessionCleanupService } from './application/session-cleanup.service';
import { AuthRepository } from './infrastructure/auth.repository';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { TenantJwtAuthGuard } from './presentation/guards/tenant-jwt-auth.guard';
import { PosJwtAuthGuard } from './presentation/guards/pos-jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { TenantStatusGuard } from './presentation/guards/tenant-status.guard';
import { FeatureGuard } from './presentation/guards/feature.guard';

@Module({
  imports: [AuditModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    SessionCleanupService,
    JwtAuthGuard,
    TenantJwtAuthGuard,
    PosJwtAuthGuard,
    PasswordHashingService,
    RolesGuard,
    TenantStatusGuard,
    FeatureGuard,
  ],
  // Export the guards plus their dependencies (JwtService, AuthRepository) so
  // other feature modules can protect routes with JwtAuthGuard/RolesGuard.
  exports: [
    AuthService,
    JwtAuthGuard,
    TenantJwtAuthGuard,
    PosJwtAuthGuard,
    RolesGuard,
    TenantStatusGuard,
    FeatureGuard,
    JwtModule,
    AuthRepository,
    PasswordHashingService,
  ],
})
export class AuthModule {}
