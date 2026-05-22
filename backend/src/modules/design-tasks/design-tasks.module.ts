import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { DesignTasksController } from './design-tasks.controller'
import { DesignTasksService } from './design-tasks.service'

@Module({
  controllers: [DesignTasksController],
  providers: [DesignTasksService, ActivityLogService],
  exports: [DesignTasksService],
})
export class DesignTasksModule {}
