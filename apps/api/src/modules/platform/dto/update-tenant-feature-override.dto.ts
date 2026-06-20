import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTenantFeatureOverrideDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string | null;
}
