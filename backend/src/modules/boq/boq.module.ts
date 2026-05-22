import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { BOQController } from './boq.controller'
import { BOQService } from './boq.service'

@Module({
  controllers: [BOQController],
  providers: [BOQService, ActivityLogService],
  exports: [BOQService],
})
export class BOQModule {}
