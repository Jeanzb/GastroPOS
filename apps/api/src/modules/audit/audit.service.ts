import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { toAuditLogCreateData } from './audit-log.mapper';
import type { RecordAuditLogInput } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.auditRepository.create(toAuditLogCreateData(input));
  }

  async tryRecord(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.record(input);
    } catch (error) {
      this.logger.warn(
        `Audit log write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
