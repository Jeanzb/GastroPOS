import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../../../../common/tenant-context';
import type { Env } from '../../../../config/env.schema';
import type { AccessTokenPayload, AuthenticatedUser } from '../../auth.types';
import { AuthRepository } from '../../infrastructure/auth.repository';

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly authRepository: AuthRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const payload = await this.verifyToken(token);
    const user = await this.authRepository.findAuthenticatedUserBySession(
      payload.sessionId,
    );
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid bearer token.');
    }

    request.user = user;
    this.tenantContext.set({
      tenantId: user.tenantId,
      branchId: user.branchId,
      actorUserId: user.id,
    });
    return true;
  }

  private async verifyToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token,
        {
          secret: this.config.get('TENANT_JWT_ACCESS_SECRET', { infer: true }),
          issuer: this.config.get('TENANT_JWT_ISSUER', { infer: true }),
          audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        },
      );

      if (!isAccessTokenPayload(payload)) {
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

function extractBearerToken(
  authorizationHeader: string | string[] | undefined,
): string | null {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [type, token] = authorizationHeader.split(' ');
  return type === 'Bearer' && token ? token : null;
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<AccessTokenPayload>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    (payload.authScope === 'TENANT' || payload.authScope === 'POS') &&
    typeof payload.role === 'string' &&
    typeof payload.tenantId === 'string' &&
    typeof payload.sessionId === 'string' &&
    (typeof payload.branchId === 'string' || payload.branchId === null)
  );
}
