import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../config/env.schema';
import { PlatformRepository } from '../platform.repository';
import type { PlatformAccessTokenPayload, AuthenticatedPlatformUser } from '../platform.types';

interface RequestWithPlatformUser {
  headers: Record<string, string | string[] | undefined>;
  platformUser?: AuthenticatedPlatformUser;
}

@Injectable()
export class PlatformJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly repository: PlatformRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithPlatformUser>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const payload = await this.verifyToken(token);
    const user = await this.repository.findAuthenticatedPlatformUserBySession(payload.sessionId);
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid bearer token.');
    }

    request.platformUser = user;
    return true;
  }

  private async verifyToken(token: string): Promise<PlatformAccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
        secret: this.config.get('PLATFORM_JWT_ACCESS_SECRET', { infer: true }),
        issuer: this.config.get('PLATFORM_JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
      });
      if (!isPlatformAccessTokenPayload(payload)) {
        throw new UnauthorizedException('Invalid bearer token.');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid bearer token.');
    }
  }
}

function extractBearerToken(authorizationHeader: string | string[] | undefined): string | null {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }
  const [type, token] = authorizationHeader.split(' ');
  return type === 'Bearer' && token ? token : null;
}

function isPlatformAccessTokenPayload(value: unknown): value is PlatformAccessTokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as Partial<PlatformAccessTokenPayload>;
  return (
    typeof payload.sub === 'string' &&
    payload.authScope === 'PLATFORM' &&
    typeof payload.platformRole === 'string' &&
    typeof payload.sessionId === 'string'
  );
}
