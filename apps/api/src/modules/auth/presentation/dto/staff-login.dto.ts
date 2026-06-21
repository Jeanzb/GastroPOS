import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ description: 'Branch the POS terminal belongs to.' })
  @IsString()
  @MinLength(1)
  branchId!: string;

  @ApiProperty({ description: 'Staff national ID (cédula).', example: '1098765432' })
  @IsString()
  @Matches(/^\d{4,15}$/, { message: 'Document number must be 4 to 15 digits.' })
  documentNumber!: string;
}
