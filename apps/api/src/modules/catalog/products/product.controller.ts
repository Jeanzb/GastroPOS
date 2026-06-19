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
import type { PaginatedResult, ProductDto } from '@gastroai/contracts';
import { RequireRoles } from '../../auth/presentation/decorators/require-roles.decorator';
import { CurrentActor } from '../../auth/presentation/decorators/current-actor.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import type { CatalogActor } from '../catalog.types';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('OWNER', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'INVENTORY_MANAGER')
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get()
  list(
    @CurrentActor() actor: CatalogActor,
    @Query() query: ListProductsQueryDto,
  ): Promise<PaginatedResult<ProductDto>> {
    return this.service.list(actor, query);
  }

  @Get(':id')
  getById(@CurrentActor() actor: CatalogActor, @Param('id') id: string): Promise<ProductDto> {
    return this.service.getById(actor, id);
  }

  @Post()
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  create(@CurrentActor() actor: CatalogActor, @Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.service.create(actor, dto);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN', 'INVENTORY_MANAGER')
  update(
    @CurrentActor() actor: CatalogActor,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @RequireRoles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: CatalogActor, @Param('id') id: string): Promise<void> {
    return this.service.remove(actor, id);
  }
}
