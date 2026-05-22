import { Module } from '@nestjs/common'
import { StorageModule } from '../storage/storage.module'
import { DailyReportsController } from './daily-reports.controller'
import { DailyReportsService } from './daily-reports.service'

@Module({
  imports: [StorageModule],
  controllers: [DailyReportsController],
  providers: [DailyReportsService],
  exports: [DailyReportsService],
})
export class DailyReportsModule {}
