import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@gastroai.local' })
  @IsEmail()
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

