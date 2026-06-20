import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export const INVENTORY_ADJUSTMENT_TYPES = ['IN', 'OUT'] as const;

export type InventoryAdjustmentType = (typeof INVENTORY_ADJUSTMENT_TYPES)[number];

export class AdjustInventoryStockDto {
  @ApiProperty({ enum: INVENTORY_ADJUSTMENT_TYPES })
  @IsIn(INVENTORY_ADJUSTMENT_TYPES)
  type!: InventoryAdjustmentType;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'Conteo físico de cierre' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ example: 12000 })
  @ValidateIf((dto: AdjustInventoryStockDto) => dto.type === 'IN')
  @IsInt()
  @Min(1)
  unitCost?: number;
}
