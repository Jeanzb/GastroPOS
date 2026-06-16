import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { LoginUserRecord } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveLoginCandidates(
    email: string,
    tenantSlug?: string,
  ): Promise<LoginUserRecord[]> {
    return this.prisma.user.findMany({
      where: {
        email,
        isActive: true,
        deletedAt: null,
        tenant: {
          isActive: true,
          deletedAt: null,
          ...(tenantSlug ? { slug: tenantSlug } : {}),
        },
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
      },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
  }
}

