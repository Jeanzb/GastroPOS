import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePlatformTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MinLength(2)
  @MaxLength(80)
  slug!: string;

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
}
