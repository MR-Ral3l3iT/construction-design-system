import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { ApprovalsController } from './approvals.controller'
import { ApprovalsService } from './approvals.service'

@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ActivityLogService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
