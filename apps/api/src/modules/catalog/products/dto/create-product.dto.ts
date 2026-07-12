import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductRecipeIngredientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  ingredientId!: string;

  @ApiProperty({ example: 150, description: 'Integer quantity in the ingredient base unit.' })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Empanada de carne' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    example: 3500,
    description: 'Price in integer minor units of the currency (e.g. COP pesos). Never a float.',
  })
  @IsInt()
  @Min(0)
  priceAmount!: number;

  @ApiPropertyOptional({ example: 'COP', default: 'COP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCategoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Hamburguesa clasica' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fiscalName?: string;

  @ApiPropertyOptional({ example: 'BURGER-001' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fiscalCodeReference?: string;

  @ApiPropertyOptional({ example: '94', default: '94' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  unitMeasureCode?: string;

  @ApiPropertyOptional({ enum: ['999', '001', '020', '010'], default: '999' })
  @IsOptional()
  @IsIn(['999', '001', '020', '010'])
  standardCode?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isExcluded?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  incApplies?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isInventoried?: boolean;

  @ApiPropertyOptional({ type: [ProductRecipeIngredientDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductRecipeIngredientDto)
  recipeIngredients?: ProductRecipeIngredientDto[];
}
