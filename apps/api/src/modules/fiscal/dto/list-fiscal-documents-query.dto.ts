import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FiscalInvoiceStatus } from '../../../../generated/prisma';

export class ListFiscalDocumentsQueryDto {
  @ApiPropertyOptional({ enum: FiscalInvoiceStatus })
  @IsOptional()
  @IsEnum(FiscalInvoiceStatus)
  status?: FiscalInvoiceStatus;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
