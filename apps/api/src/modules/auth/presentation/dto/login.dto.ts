import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const LOGIN_IDENTIFIER = /^[A-Za-z0-9._%+@-]{3,160}$/;

export class LoginDto {
  @ApiProperty({ example: 'GastroIA Demo', description: 'Restaurant name or NIT.' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  tenantIdentifier!: string;

  @ApiProperty({ example: 'owner@gastroai.local', description: 'Email or username.' })
  @IsString()
  @MaxLength(160)
  @Matches(LOGIN_IDENTIFIER, { message: 'email must be a valid email or username' })
  email!: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ example: 'gastroai-demo' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
