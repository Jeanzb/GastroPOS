import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const CASH_MOVEMENT_INPUT_TYPES = [
  'CASH_IN',
  'CASH_OUT',
  'SALE_PAYMENT',
  'REFUND',
  'TIP',
  'ADJUSTMENT',
] as const;

export type CashMovementInputType = (typeof CASH_MOVEMENT_INPUT_TYPES)[number];

export class RegisterCashMovementDto {
  @ApiProperty({ enum: CASH_MOVEMENT_INPUT_TYPES })
  @IsIn(CASH_MOVEMENT_INPUT_TYPES)
  type!: CashMovementInputType;

  @ApiProperty({ example: 5000, description: 'Amount in integer minor units.' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
