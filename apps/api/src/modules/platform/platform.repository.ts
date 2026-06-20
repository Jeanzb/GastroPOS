import { Injectable } from '@nestjs/common';
import type { PlatformRole, TenantStatus } from '@gastroai/contracts';
import { UserRole } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedPlatformUser } from './platform.types';

export interface PlatformTenantCreateData {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerFullName: string;
  ownerPasswordHash: string;
  branchName: string;
  branchCode: string;
}

@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPlatformUserByEmail(email: string) {
    return this.prisma.platformUser.findFirst({
      where: { email, isActive: true, deletedAt: null },
    });
  }

  async createPlatformSession(input: {
    platformUserId: string;
    tokenHash: string;
    familyId: string;
    sessionExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ sessionId: string; refreshTokenId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.platformSession.create({
        data: {
          platformUserId: input.platformUserId,
          expiresAt: input.sessionExpiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        select: { id: true },
      });
      const refreshToken = await tx.platformRefreshToken.create({
        data: {
          platformSessionId: session.id,
          tokenHash: input.tokenHash,
          familyId: input.familyId,
          expiresAt: input.refreshTokenExpiresAt,
        },
        select: { id: true },
      });
      await tx.platformUser.update({
        where: { id: input.platformUserId },
        data: { lastLoginAt: new Date() },
      });
      return { sessionId: session.id, refreshTokenId: refreshToken.id };
    });
  }

  findPlatformRefreshTokenById(id: string) {
    return this.prisma.platformRefreshToken.findFirst({
      where: {
        id,
        session: {
          user: { isActive: true, deletedAt: null },
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
            isActive: true,
            expiresAt: true,
            revokedAt: true,
            user: {
              select: {
                id: true,
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

  async rotatePlatformRefreshToken(input: {
    currentRefreshTokenId: string;
    sessionId: string;
    familyId: string;
    tokenHash: string;
    refreshTokenExpiresAt: Date;
    sessionExpiresAt: Date;
  }): Promise<{ refreshTokenId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const refreshToken = await tx.platformRefreshToken.create({
        data: {
          platformSessionId: input.sessionId,
          tokenHash: input.tokenHash,
          familyId: input.familyId,
          expiresAt: input.refreshTokenExpiresAt,
        },
        select: { id: true },
      });
      await tx.platformRefreshToken.update({
        where: { id: input.currentRefreshTokenId },
        data: { revokedAt: new Date(), replacedByTokenId: refreshToken.id },
      });
      await tx.platformSession.update({
        where: { id: input.sessionId },
        data: { expiresAt: input.sessionExpiresAt },
      });
      return { refreshTokenId: refreshToken.id };
    });
  }

  async revokePlatformSession(sessionId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.platformSession.update({
        where: { id: sessionId },
        data: { isActive: false, revokedAt: new Date() },
      }),
      this.prisma.platformRefreshToken.updateMany({
        where: { platformSessionId: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async findAuthenticatedPlatformUserBySession(
    sessionId: string,
  ): Promise<AuthenticatedPlatformUser | null> {
    const session = await this.prisma.platformSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { isActive: true, deletedAt: null },
      },
      select: {
        id: true,
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
    if (!session) {
      return null;
    }
    return { ...session.user, sessionId: session.id };
  }

  getOverview() {
    return this.prisma.tenant.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  }

  listTenants() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { code: true } },
        _count: { select: { branches: true, users: true } },
        users: {
          select: { lastLoginAt: true },
          orderBy: { lastLoginAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  findTenantById(id: string) {
    return this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: this.tenantDetailInclude(),
    });
  }

  findBasicPlan() {
    return this.prisma.plan.findUnique({ where: { code: 'BASIC' } });
  }

  listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: { features: { include: { feature: true } } },
    });
  }

  async createTenant(data: PlatformTenantCreateData) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findUnique({ where: { code: 'BASIC' } });
      if (!plan) {
        throw new Error('BASIC plan is required before creating tenants.');
      }
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          status: 'ACTIVE',
          isActive: true,
          planId: plan.id,
          settings: { create: {} },
        },
      });
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: data.branchName,
          code: data.branchCode,
        },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          email: data.ownerEmail,
          fullName: data.ownerFullName,
          passwordHash: data.ownerPasswordHash,
          role: UserRole.OWNER,
        },
      });
      return tx.tenant.findUniqueOrThrow({
        where: { id: tenant.id },
        include: this.tenantDetailInclude(),
      });
    });
  }

  updateTenantStatus(id: string, status: TenantStatus, suspensionReason?: string | null) {
    const now = new Date();
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status,
        isActive: !['CANCELLED', 'ARCHIVED'].includes(status),
        suspendedAt: status === 'SUSPENDED' ? now : null,
        cancelledAt: status === 'CANCELLED' ? now : null,
        archivedAt: status === 'ARCHIVED' ? now : null,
        suspensionReason: status === 'SUSPENDED' ? suspensionReason ?? null : null,
      },
      include: this.tenantDetailInclude(),
    });
  }

  async updateTenantPlan(id: string, planCode: 'BASIC') {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) {
      throw new Error('BASIC plan is required before assigning tenants.');
    }
    return this.prisma.tenant.update({
      where: { id },
      data: { planId: plan.id },
      include: this.tenantDetailInclude(),
    });
  }

  private tenantDetailInclude() {
    return {
      plan: {
        include: { features: { include: { feature: true } } },
      },
      _count: { select: { branches: true, users: true } },
      branches: {
        where: { deletedAt: null },
        select: { id: true, code: true, name: true, isActive: true },
        orderBy: { name: 'asc' as const },
      },
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
        orderBy: { fullName: 'asc' as const },
      },
      featureOverrides: { include: { feature: true } },
    };
  }
}
