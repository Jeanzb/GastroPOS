import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePlatformTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[0-9.-]+$/)
  nit!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  municipality!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  taxRegime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  fiscalResponsibility?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  ownerFullName!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(100)
  ownerTemporaryPassword!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  branchName!: string;

  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  @MinLength(2)
  @MaxLength(20)
  branchCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  branchAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  branchPhone?: string;
}
