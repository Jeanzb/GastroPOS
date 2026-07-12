import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const CUSTOMER_DOCUMENT_TYPES = ['CC', 'NIT', 'CE', 'PP', 'TI', 'NUIP', 'OTHER'] as const;

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

  @ApiPropertyOptional({ description: 'Digito de verificacion separado del NIT.' })
  @IsOptional()
  @Matches(/^\d$/, { message: 'dv must contain exactly one digit' })
  dv?: string;

  @ApiProperty({ example: 'Distribuidora La 80 S.A.S.' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'facturacion@empresa.co' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ example: 'Carrera 7 # 18-24' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  address!: string;

  @ApiPropertyOptional({ default: 'CO' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional({ description: 'Codigo DIVIPOLA cuando countryCode es CO.' })
  @IsOptional()
  @Matches(/^\d{5}$/, { message: 'municipalityCode must contain five digits' })
  municipalityCode?: string;

  @ApiPropertyOptional({ default: 'ZZ' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  tributeCode?: string;

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
