import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListSuppliersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active state.' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by name, document or email.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
