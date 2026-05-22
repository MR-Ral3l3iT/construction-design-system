import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { IssuesController } from './issues.controller'
import { IssuesService } from './issues.service'

@Module({
  controllers: [IssuesController],
  providers: [IssuesService, ActivityLogService],
  exports: [IssuesService],
})
export class IssuesModule {}
