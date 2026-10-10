import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { CompanyModule } from '../company/company.module'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'

@Module({
  imports: [CompanyModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, ActivityLogService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
