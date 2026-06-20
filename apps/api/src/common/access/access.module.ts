import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../redis';
import { BranchScopeService } from './branch-scope.service';
import { TenantAccessCacheService } from './tenant-access-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [BranchScopeService, TenantAccessCacheService],
  exports: [BranchScopeService, TenantAccessCacheService],
})
export class AccessModule {}
