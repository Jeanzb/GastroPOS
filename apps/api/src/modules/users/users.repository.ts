import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { LoginUserRecord } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveLoginCandidates(
    email: string,
    tenantIdentifier?: string,
    tenantSlug?: string,
  ): Promise<LoginUserRecord[]> {
    const rawIdentifier = tenantIdentifier?.trim();
    const normalizedIdentifier = rawIdentifier?.toLowerCase();
    const normalizedNit = normalizeDocument(rawIdentifier);

    return this.prisma.user.findMany({
      where: {
        email,
        isActive: true,
        deletedAt: null,
        tenant: {
          isActive: true,
          deletedAt: null,
          ...(rawIdentifier || tenantSlug
            ? {
                OR: [
                  ...(rawIdentifier
                    ? [{ name: { equals: rawIdentifier, mode: 'insensitive' as const } }]
                    : []),
                  ...(normalizedIdentifier ? [{ slug: normalizedIdentifier }] : []),
                  ...(tenantSlug ? [{ slug: tenantSlug }] : []),
                  ...(normalizedNit
                    ? [
                        {
                          fiscalProfile: {
                            is: { nit: normalizedNit },
                          },
                        },
                      ]
                    : []),
                ],
              }
            : {}),
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

function normalizeDocument(value: string | undefined): string | undefined {
  const normalized = value?.replace(/[^0-9]/g, '');
  return normalized && normalized.length >= 3 ? normalized : undefined;
}
