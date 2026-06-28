import { Injectable } from '@nestjs/common';
import type { BranchDto } from '@gastroai/contracts';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenancyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listBranches(tenantId: string, branchId?: string): Promise<BranchDto[]> {
    return this.prisma.branch.findMany({
      where: {
        tenantId,
        id: branchId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        code: true,
        city: true,
        address: true,
        phone: true,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }
}
