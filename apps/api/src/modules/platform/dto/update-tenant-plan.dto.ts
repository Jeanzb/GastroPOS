import { IsIn } from 'class-validator';

export class UpdateTenantPlanDto {
  @IsIn(['BASIC'])
  planCode!: 'BASIC';
}
