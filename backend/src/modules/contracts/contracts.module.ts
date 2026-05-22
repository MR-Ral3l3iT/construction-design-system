import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { ContractsController } from './contracts.controller'
import { ContractsService } from './contracts.service'

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, ActivityLogService],
  exports: [ContractsService],
})
export class ContractsModule {}
