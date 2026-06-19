import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const;
const DOCUMENT_TYPES = ['CC', 'NIT', 'CE', 'PP', 'TI', 'NUIP', 'OTHER'] as const;

export class ChargeFiscalCustomerDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  documentType!: (typeof DOCUMENT_TYPES)[number];

  @ApiProperty({ example: '900123456' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  documentNumber!: string;

  @ApiProperty({ example: 'Restaurante Demo S.A.S.' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  taxResponsibility?: string;
}

export class ChargeTableAccountDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional({ description: 'Defaults to the sale balance due.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 'VOUCHER-123' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  requiresInvoice!: boolean;

  @ApiPropertyOptional({ type: ChargeFiscalCustomerDto })
  @ValidateIf((payload: ChargeTableAccountDto) => payload.requiresInvoice)
  @ValidateNested()
  @Type(() => ChargeFiscalCustomerDto)
  customer?: ChargeFiscalCustomerDto;
}
