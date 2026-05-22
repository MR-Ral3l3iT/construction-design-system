import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { ChangeRequestsController } from './change-requests.controller'
import { ChangeRequestsService } from './change-requests.service'

@Module({
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService, ActivityLogService],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
