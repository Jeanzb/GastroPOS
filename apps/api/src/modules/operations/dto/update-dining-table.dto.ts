import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { UpdateDiningTableRequest } from '@gastroai/contracts';

export class UpdateDiningTableDto implements UpdateDiningTableRequest {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  @Transform(({ value }) => value?.trim())
  number?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsString()
  zoneId?: string;
}
