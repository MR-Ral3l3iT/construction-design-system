import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ActivityLogService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
