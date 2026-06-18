import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CloseCashSessionDto {
  @ApiProperty({
    example: 150000,
    description: 'Counted cash at close, in integer minor units.',
  })
  @IsInt()
  @Min(0)
  countedAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
