import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { StockMovementType } from '../../../../generated/prisma';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export const STOCK_MOVEMENT_SORT_FIELDS = [
  'createdAt',
  'inventoryItemName',
  'type',
  'quantity',
  'stockAfter',
  'totalCost',
] as const;

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type StockMovementSortField = (typeof STOCK_MOVEMENT_SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export class ListStockMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inventoryItemId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @ApiPropertyOptional({ enum: STOCK_MOVEMENT_SORT_FIELDS })
  @IsOptional()
  @IsIn(STOCK_MOVEMENT_SORT_FIELDS)
  sortBy?: StockMovementSortField;

  @ApiPropertyOptional({ enum: SORT_DIRECTIONS })
  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortDir?: SortDirection;
}
