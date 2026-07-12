import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LookupFactusAcquirerQueryDto {
  @ApiProperty({ example: '31' })
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  identificationDocumentCode!: string;

  @ApiProperty({ example: '900123456' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  identificationNumber!: string;
}
