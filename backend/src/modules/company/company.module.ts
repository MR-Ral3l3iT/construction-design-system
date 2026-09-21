import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { AccountingSettingsService } from './accounting-settings.service'
import {
  ChartOfAccountsController,
  DocumentSequencesController,
  FiscalPeriodsController,
  WhtRatesController,
} from './accounting-settings.controller'
import { CompanyController } from './company.controller'
import { CompanyService } from './company.service'
import { DocumentSequenceService } from './document-sequence.service'

/**
 * รากฐานของระบบบัญชี — โมดูลอื่น (documents, transactions, vendors) import
 * โมดูลนี้เพื่อใช้ DocumentSequenceService, CompanyService และ AccountingSettingsService
 */
@Module({
  controllers: [
    CompanyController,
    ChartOfAccountsController,
    WhtRatesController,
    FiscalPeriodsController,
    DocumentSequencesController,
  ],
  providers: [
    CompanyService,
    AccountingSettingsService,
    DocumentSequenceService,
    ActivityLogService,
  ],
  exports: [CompanyService, AccountingSettingsService, DocumentSequenceService],
})
export class CompanyModule {}
