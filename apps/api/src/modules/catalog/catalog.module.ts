import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ProductCategoryController } from './categories/product-category.controller';
import { ProductCategoryRepository } from './categories/product-category.repository';
import { ProductCategoryService } from './categories/product-category.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProductCategoryController],
  providers: [ProductCategoryService, ProductCategoryRepository],
})
export class CatalogModule {}
