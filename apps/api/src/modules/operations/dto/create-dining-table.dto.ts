import { Transform } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import type { CreateDiningTableRequest } from '@gastroai/contracts';

export class CreateDiningTableDto implements CreateDiningTableRequest {
  @IsString()
  @MaxLength(12)
  @Transform(({ value }) => value?.trim())
  number!: string;

  @IsInt()
  @Min(1)
  seats!: number;
}
