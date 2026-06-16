import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { PasswordHashingService } from './application/password-hashing.service';
import { AuthRepository } from './infrastructure/auth.repository';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';

@Module({
  imports: [AuditModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    JwtAuthGuard,
    PasswordHashingService,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
