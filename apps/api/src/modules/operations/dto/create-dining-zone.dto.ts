import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { CreateDiningZoneRequest } from '@gastroai/contracts';

export class CreateDiningZoneDto implements CreateDiningZoneRequest {
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
