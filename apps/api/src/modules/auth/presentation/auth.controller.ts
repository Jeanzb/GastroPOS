import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { RoleProfile } from '@gastroai/contracts';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../application/auth.service';
import type { AuthenticatedUser, AuthRequestMetadata, AuthResponse } from '../auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface RequestMetadataSource {
  ip?: string;
  requestId?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Authenticated user and token pair.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  login(
    @Body() dto: LoginDto,
    @Req() request: RequestMetadataSource,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<AuthResponse> {
    return this.authService.login({
      email: dto.email,
      password: dto.password,
      tenantSlug: dto.tenantSlug,
      metadata: requestMetadata(request, userAgent, forwardedFor),
    });
  }

  @Post('pin-login')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Authenticated employee and token pair from a POS PIN.' })
  @ApiUnauthorizedResponse({ description: 'Invalid PIN for this branch.' })
  pinLogin(
    @Body() dto: PinLoginDto,
    @Req() request: RequestMetadataSource,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<AuthResponse> {
    return this.authService.pinLogin({
      branchId: dto.branchId,
      pin: dto.pin,
      metadata: requestMetadata(request, userAgent, forwardedFor),
    });
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Rotated refresh token and new access token.' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: RequestMetadataSource,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<AuthResponse> {
    return this.authService.refresh({
      refreshToken: dto.refreshToken,
      metadata: requestMetadata(request, userAgent, forwardedFor),
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Current authenticated user.' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Roles the current user can operate as in the UI.' })
  roles(@CurrentUser() user: AuthenticatedUser): RoleProfile[] {
    return user.availableRoles;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestMetadataSource,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<void> {
    await this.authService.logout(user, requestMetadata(request, userAgent, forwardedFor));
  }
}

function requestMetadata(
  request: RequestMetadataSource,
  userAgent: string | undefined,
  forwardedFor: string | undefined,
): AuthRequestMetadata {
  return {
    requestId: request.requestId,
    userAgent,
    ipAddress: firstForwardedIp(forwardedFor) ?? request.ip,
  };
}

function firstForwardedIp(value: string | undefined): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}
