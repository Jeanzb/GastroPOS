import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../generated/prisma';

const LOGIN_IDENTIFIER = /^[A-Za-z0-9._%+@-]{3,160}$/;

export class CreateEmployeeDto {
  @ApiProperty({ example: 'jeanzb', description: 'Email or username used to log in.' })
  @IsString()
  @MaxLength(160)
  @Matches(LOGIN_IDENTIFIER, { message: 'email must be a valid email or username' })
  email!: string;

  @ApiProperty({ example: 'Diego Granados' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.WAITER })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  temporaryPassword!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  branchId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
