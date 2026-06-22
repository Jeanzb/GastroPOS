import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInventoryProductLinkDto {
  @ApiPropertyOptional({
    description: 'Product to link as the main 1:1 inventory source. Null unlinks it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string | null;
}
