import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  branchId!: string;

  @ApiProperty({ example: 'INS-CARNE-MOLIDA' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  sku!: string;

  @ApiProperty({ example: 'Carne molida' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'KG' })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  baseUnitCode!: string;

  @ApiPropertyOptional({ example: 'Kilogramo' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  baseUnitName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((dto: CreateInventoryItemDto) => (dto.initialStock ?? 0) > 0)
  @IsInt()
  @Min(1)
  initialUnitCost?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;
}
