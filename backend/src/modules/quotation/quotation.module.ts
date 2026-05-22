import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { QuotationController } from './quotation.controller'
import { QuotationService } from './quotation.service'

@Module({
  controllers: [QuotationController],
  providers: [QuotationService, ActivityLogService],
  exports: [QuotationService],
})
export class QuotationModule {}
