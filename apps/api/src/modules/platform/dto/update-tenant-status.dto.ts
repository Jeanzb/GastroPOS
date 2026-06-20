import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TENANT_STATUSES, type TenantStatus } from '@gastroai/contracts';

export class UpdateTenantStatusDto {
  @IsIn(TENANT_STATUSES)
  status!: TenantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  suspensionReason?: string | null;
}
