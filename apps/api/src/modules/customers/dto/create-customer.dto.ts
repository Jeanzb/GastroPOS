import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const CUSTOMER_DOCUMENT_TYPES = [
  'CC',
  'NIT',
  'CE',
  'PP',
  'TI',
  'NUIP',
  'OTHER',
] as const;

export type CustomerDocumentTypeInput = (typeof CUSTOMER_DOCUMENT_TYPES)[number];

export class CreateCustomerDto {
  @ApiProperty({ enum: CUSTOMER_DOCUMENT_TYPES })
  @IsIn(CUSTOMER_DOCUMENT_TYPES)
  documentType!: CustomerDocumentTypeInput;

  @ApiProperty({ example: '900123456' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  documentNumber!: string;

  @ApiProperty({ example: 'Distribuidora La 80 S.A.S.' })
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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
