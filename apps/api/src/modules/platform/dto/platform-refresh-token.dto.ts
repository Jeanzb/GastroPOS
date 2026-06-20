import { IsString, MinLength } from 'class-validator';

export class PlatformRefreshTokenDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
