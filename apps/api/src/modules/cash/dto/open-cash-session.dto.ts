import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OpenCashSessionDto {
  @ApiProperty({
    example: 100000,
    description: 'Opening balance in integer minor units (e.g. COP pesos).',
  })
  @IsInt()
  @Min(0)
  openingBalance!: number;

  @ApiPropertyOptional({ description: 'Branch id; defaults to the user branch.' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
