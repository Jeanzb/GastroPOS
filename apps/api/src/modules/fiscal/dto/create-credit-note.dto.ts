import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// This first operational flow supports quantity-backed refunds and full
// cancellations. Price and commercial-discount corrections require a distinct
// amount-entry policy before they can be exposed safely.
const CREDIT_NOTE_CORRECTION_CONCEPT_CODES = ['1', '2'] as const;

export class CreateCreditNoteLineDto {
  @ApiProperty({ example: 'clx8m4bba0001m8c6l6vcs7aa' })
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  invoiceLineId!: string;

  @ApiProperty({
    example: 1,
    description: 'Whole sale units. The current POS stores restaurant line quantities as integers.',
  })
  @IsInt()
  @Min(1)
  @Max(999_999)
  quantity!: number;
}

export class CreateCreditNoteDto {
  @ApiProperty({ example: '2a1d0e8a-7a76-4a39-9326-2a637e7d4c21' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @ApiProperty({ enum: CREDIT_NOTE_CORRECTION_CONCEPT_CODES, example: '1' })
  @IsString()
  @IsIn(CREDIT_NOTE_CORRECTION_CONCEPT_CODES)
  correctionConceptCode!: (typeof CREDIT_NOTE_CORRECTION_CONCEPT_CODES)[number];

  @ApiPropertyOptional({ example: 'Devolucion parcial de productos no consumidos.' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  observation?: string;

  @ApiProperty({ type: [CreateCreditNoteLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateCreditNoteLineDto)
  lines!: CreateCreditNoteLineDto[];
}
