import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser, TenantAuthScope } from '../auth.types';
import { buildAccessProfile } from '../application/access-profile';

interface CreateSessionInput {
  tenantId: string;
  branchId: string | null;
  userId: string;
  authScope: TenantAuthScope;
  refreshTokenHash: string;
  refreshTokenFamilyId: string;
  sessionExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface CreatedSessionToken {
  sessionId: string;
  refreshTokenId: string;
}

interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  session: {
    id: string;
    tenantId: string;
    branchId: string | null;
    authScope: TenantAuthScope | 'PLATFORM';
    isActive: boolean;
    expiresAt: Date;
    revokedAt: Date | null;
    user: {
      id: string;
      tenantId: string;
      email: string;
      fullName: string;
      role: AuthenticatedUser['role'];
    };
  };
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSessionWithRefreshToken(input: CreateSessionInput): Promise<CreatedSessionToken> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          userId: input.userId,
          authScope: input.authScope,
          expiresAt: input.sessionExpiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        select: { id: true },
      });

      const refreshToken = await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: input.refreshTokenHash,
          familyId: input.refreshTokenFamilyId,
          expiresAt: input.refreshTokenExpiresAt,
        },
        select: { id: true },
      });

      return {
        sessionId: session.id,
        refreshTokenId: refreshToken.id,
      };
    });
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        id,
        session: {
          user: {
            isActive: true,
            deletedAt: null,
            tenant: {
              isActive: true,
              deletedAt: null,
            },
          },
        },
      },
      select: {
        id: true,
        tokenHash: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
        session: {
          select: {
            id: true,
            tenantId: true,
            branchId: true,
            authScope: true,
            isActive: true,
            expiresAt: true,
            revokedAt: true,
            user: {
              select: {
                id: true,
                tenantId: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async rotateRefreshToken(input: {
    currentRefreshTokenId: string;
    sessionId: string;
    familyId: string;
    tokenHash: string;
    refreshTokenExpiresAt: Date;
    sessionExpiresAt: Date;
  }): Promise<{ refreshTokenId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const refreshToken = await tx.refreshToken.create({
        data: {
          sessionId: input.sessionId,
          tokenHash: input.tokenHash,
          familyId: input.familyId,
          expiresAt: input.refreshTokenExpiresAt,
        },
        select: { id: true },
      });

      await tx.refreshToken.update({
        where: { id: input.currentRefreshTokenId },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: refreshToken.id,
        },
      });

      await tx.session.update({
        where: { id: input.sessionId },
        data: {
          expiresAt: input.sessionExpiresAt,
        },
      });

      return { refreshTokenId: refreshToken.id };
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);
  }

  async findAuthenticatedUserBySession(sessionId: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: {
          isActive: true,
          deletedAt: null,
          tenant: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        branchId: true,
        authScope: true,
        user: {
          select: {
            id: true,
            tenantId: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      authScope: session.authScope === 'POS' ? 'POS' : 'TENANT',
      ...buildAccessProfile(session.user.role),
      tenantId: session.user.tenantId,
      branchId: session.branchId,
      sessionId: session.id,
    };
  }

  /** Active employees of a branch that have a PIN set — candidates for PIN login. */
  findActivePinCandidatesByBranch(branchId: string): Promise<PinLoginCandidate[]> {
    return this.prisma.user.findMany({
      where: {
        branchId,
        isActive: true,
        deletedAt: null,
        pinHash: { not: null },
        tenant: { isActive: true, deletedAt: null },
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        email: true,
        fullName: true,
        role: true,
        pinHash: true,
        pinLockedUntil: true,
      },
    }) as Promise<PinLoginCandidate[]>;
  }

  async resetPinAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedPinAttempts: 0, pinLockedUntil: null },
    });
  }
}

export interface PinLoginCandidate {
  id: string;
  tenantId: string;
  branchId: string | null;
  email: string;
  fullName: string;
  role: AuthenticatedUser['role'];
  pinHash: string;
  pinLockedUntil: Date | null;
}
