import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ProductCategoryController } from './categories/product-category.controller';
import { ProductCategoryRepository } from './categories/product-category.repository';
import { ProductCategoryService } from './categories/product-category.service';
import { ProductController } from './products/product.controller';
import { ProductRepository } from './products/product.repository';
import { ProductService } from './products/product.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProductCategoryController, ProductController],
  providers: [
    ProductCategoryService,
    ProductCategoryRepository,
    ProductService,
    ProductRepository,
  ],
})
export class CatalogModule {}
