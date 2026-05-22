import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { ProjectPlansController } from './project-plans.controller'
import { ProjectPlansService } from './project-plans.service'

@Module({
  controllers: [ProjectPlansController],
  providers: [ProjectPlansService, ActivityLogService],
  exports: [ProjectPlansService],
})
export class ProjectPlansModule {}
