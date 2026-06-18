import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ActiveCashSessionQueryDto {
  @ApiPropertyOptional({ description: 'Branch id; defaults to the user branch.' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
