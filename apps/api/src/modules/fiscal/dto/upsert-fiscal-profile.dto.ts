import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpsertFiscalProviderConfigDto } from './upsert-fiscal-provider-config.dto';

export class UpsertFiscalProfileDto {
  @ApiProperty({ example: 'Restaurante GastroAI S.A.S.' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  legalName!: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  nit!: string;

  @ApiPropertyOptional({ example: 'Responsable de IVA' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  taxRegime?: string;

  @ApiPropertyOptional({ example: ['O-13', 'O-15'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  fiscalResponsibilities?: string[];

  @ApiPropertyOptional({ example: 'Bogota D.C.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional({ example: 'Cra 7 # 12-34' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @ApiPropertyOptional({ example: '18764000000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  invoiceResolutionNumber?: string;

  @ApiPropertyOptional({ example: 'SETP' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  invoiceResolutionPrefix?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  numberingRangeFrom?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  numberingRangeTo?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  numberingValidFrom?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  numberingValidUntil?: string;

  @ApiPropertyOptional({ type: UpsertFiscalProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertFiscalProviderConfigDto)
  providerConfig?: UpsertFiscalProviderConfigDto;
}
