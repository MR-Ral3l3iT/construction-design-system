import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { DocumentsModule } from '../documents/documents.module'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports: [DocumentsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ActivityLogService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
