import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class OpenTableAccountDto {
  @ApiPropertyOptional({ example: 'Maria Restrepo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  waiterName?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  guestCount?: number;

  @ApiPropertyOptional({ example: 'Mesa familia Gomez' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerName?: string;
}
