import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { DailyUpdatesController } from './daily-updates.controller'
import { DailyUpdatesService } from './daily-updates.service'

@Module({
  controllers: [DailyUpdatesController],
  providers: [DailyUpdatesService, ActivityLogService],
  exports: [DailyUpdatesService],
})
export class DailyUpdatesModule {}
