import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ActivityLogService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
