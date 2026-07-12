import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

const FACTUS_ENVIRONMENTS = ['SANDBOX', 'PRODUCTION'] as const;

export class UpsertFactusConnectionDto {
  @ApiProperty({ enum: FACTUS_ENVIRONMENTS, default: 'SANDBOX' })
  @IsIn(FACTUS_ENVIRONMENTS)
  environment!: (typeof FACTUS_ENVIRONMENTS)[number];

  @ApiPropertyOptional({ description: 'Optional override. Defaults to the official URL for the selected environment.' })
  @IsOptional()
  @IsUrl({ require_tld: true })
  baseUrl?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  clientId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  clientSecret!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  password!: string;
}
