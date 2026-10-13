import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { CompanyModule } from '../company/company.module'
import { EstimatesController } from './estimates.controller'
import { EstimatesService } from './estimates.service'

@Module({
  imports: [CompanyModule],
  controllers: [EstimatesController],
  providers: [EstimatesService, ActivityLogService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
