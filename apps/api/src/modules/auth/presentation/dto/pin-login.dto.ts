import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class PinLoginDto {
  @ApiProperty({ description: 'Branch the POS terminal belongs to.' })
  @IsString()
  @MinLength(1)
  branchId!: string;

  @ApiProperty({ description: '4 to 6 digit numeric PIN.', example: '4821' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits.' })
  pin!: string;
}
