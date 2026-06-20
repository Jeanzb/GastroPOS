import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ example: 'INS-CARNE-MOLIDA' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  sku?: string;

  @ApiPropertyOptional({ example: 'Carne molida' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'KG' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  baseUnitCode?: string;

  @ApiPropertyOptional({ example: 'Kilogramo' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  baseUnitName?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
