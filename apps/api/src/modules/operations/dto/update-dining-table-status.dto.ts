import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { type DiningTableStatus, type UpdateDiningTableStatusRequest } from '@gastroai/contracts';

const DINING_TABLE_STATUSES: DiningTableStatus[] = ['FREE', 'OCCUPIED', 'PENDING_BILL', 'RESERVED'];

export class UpdateDiningTableStatusDto implements UpdateDiningTableStatusRequest {
  @IsIn(DINING_TABLE_STATUSES)
  status!: DiningTableStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  waiterName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  reservationName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  @Transform(({ value }) => value?.trim())
  reservationTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(({ value }) => value?.trim())
  notes?: string | null;
}
