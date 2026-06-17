import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FiscalEnvironment, FiscalProviderType } from '../../../../generated/prisma';

export class UpsertFiscalProviderConfigDto {
  @ApiProperty({ enum: FiscalProviderType, example: FiscalProviderType.TECHNOLOGY_PROVIDER })
  @IsEnum(FiscalProviderType)
  providerType!: FiscalProviderType;

  @ApiPropertyOptional({ example: 'Proveedor tecnologico autorizado' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  providerName?: string;

  @ApiPropertyOptional({ enum: FiscalEnvironment, default: FiscalEnvironment.TEST })
  @IsOptional()
  @IsEnum(FiscalEnvironment)
  environment?: FiscalEnvironment;

  @ApiPropertyOptional({ example: 'https://api.proveedor.example/v1' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  endpointUrl?: string;

  @ApiPropertyOptional({ description: 'DIAN software identifier or provider mapping.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  softwareId?: string;

  @ApiPropertyOptional({ description: 'Secret-store alias for the certificate.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  certificateAlias?: string;

  @ApiPropertyOptional({ description: 'Provider-side account identifier.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountId?: string;

  @ApiPropertyOptional({ description: 'Secret-store reference, never a raw API key.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  apiKeyRef?: string;
}
