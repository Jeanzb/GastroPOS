import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuditLogCreateData } from './audit.types';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AuditLogCreateData): Promise<void> {
    await this.prisma.auditLog.create({ data });
  }
}
