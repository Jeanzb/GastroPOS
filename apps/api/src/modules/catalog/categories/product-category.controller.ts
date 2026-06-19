import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult, ProductCategoryDto } from '@gastroai/contracts';
import { RequireRoles } from '../../auth/presentation/decorators/require-roles.decorator';
import { CurrentActor } from '../../auth/presentation/decorators/current-actor.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import type { CatalogActor } from '../catalog.types';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ListProductCategoriesQueryDto } from './dto/list-product-categories-query.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryService } from './product-category.service';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'INVENTORY_MANAGER')
@Controller('product-categories')
export class ProductCategoryController {
  constructor(private readonly service: ProductCategoryService) {}

  @Get()
  list(
    @CurrentActor() actor: CatalogActor,
    @Query() query: ListProductCategoriesQueryDto,
  ): Promise<PaginatedResult<ProductCategoryDto>> {
    return this.service.list(actor, query);
  }

  @Get(':id')
  getById(
    @CurrentActor() actor: CatalogActor,
    @Param('id') id: string,
  ): Promise<ProductCategoryDto> {
    return this.service.getById(actor, id);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  create(
    @CurrentActor() actor: CatalogActor,
    @Body() dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryDto> {
    return this.service.create(actor, dto);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  update(
    @CurrentActor() actor: CatalogActor,
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryDto> {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: CatalogActor, @Param('id') id: string): Promise<void> {
    return this.service.remove(actor, id);
  }
}
