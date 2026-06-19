import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEmployeeAccessDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
