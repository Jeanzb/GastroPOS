import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeletePlatformTenantDto {
  @IsString()
  @MinLength(8)
  @MaxLength(220)
  confirmationPhrase!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(220)
  repeatedConfirmationPhrase!: string;
}
