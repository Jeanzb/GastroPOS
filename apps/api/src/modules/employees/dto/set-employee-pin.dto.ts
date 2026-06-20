import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SetEmployeePinDto {
  @ApiProperty({ description: '4 to 6 digit numeric PIN for POS terminal login.', example: '4821' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits.' })
  pin!: string;
}
