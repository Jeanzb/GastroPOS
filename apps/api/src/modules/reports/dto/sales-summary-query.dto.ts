import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class SalesSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Start of range (ISO 8601). Defaults to start of today.' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'End of range (ISO 8601). Defaults to now.' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Restrict to a branch. Defaults to the active branch.' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
