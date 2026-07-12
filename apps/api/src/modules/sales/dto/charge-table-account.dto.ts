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
const FACTUS_PAYMENT_METHOD_CODES = ['10', '42', '20', '47', '71', '72', '1', '49', '48', 'ZZZ'] as const;

export class ChargeFiscalCustomerDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  documentType!: (typeof DOCUMENT_TYPES)[number];

  @ApiProperty({ example: '900123456' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  documentNumber!: string;

  @ApiPropertyOptional({ example: '7', description: 'Required for a NIT under GastroAI fiscal policy.' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  dv?: string;

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

  @ApiPropertyOptional({ default: 'CO' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({ example: '11001', description: 'DIVIPOLA code. Required by GastroAI for identified Colombian customers.' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  municipalityCode?: string;
}

export class ChargePaymentDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({ enum: FACTUS_PAYMENT_METHOD_CODES })
  @IsOptional()
  @IsIn(FACTUS_PAYMENT_METHOD_CODES)
  factusPaymentMethodCode?: (typeof FACTUS_PAYMENT_METHOD_CODES)[number];

  @ApiPropertyOptional({ enum: [1, 2], default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 2])
  paymentForm?: 1 | 2;

  @ApiPropertyOptional({ example: '2026-08-10', description: 'Required when paymentForm is credit (2).' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  dueDate?: string;
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

  @ApiPropertyOptional({
    enum: FACTUS_PAYMENT_METHOD_CODES,
    description: 'Official Factus payment method code: cash 10, transfer 47, debit 49, credit 48, other ZZZ.',
  })
  @IsOptional()
  @IsIn(FACTUS_PAYMENT_METHOD_CODES)
  factusPaymentMethodCode?: (typeof FACTUS_PAYMENT_METHOD_CODES)[number];

  @ApiProperty({ default: false })
  @IsBoolean()
  requiresInvoice!: boolean;

  @ApiPropertyOptional({ type: ChargeFiscalCustomerDto })
  @ValidateIf((payload: ChargeTableAccountDto) => payload.requiresInvoice)
  @ValidateNested()
  @Type(() => ChargeFiscalCustomerDto)
  customer?: ChargeFiscalCustomerDto;

  @ApiPropertyOptional({ type: [ChargePaymentDto], description: 'Mixed payments. When omitted, legacy single-payment fields are used.' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChargePaymentDto)
  payments?: ChargePaymentDto[];
}
