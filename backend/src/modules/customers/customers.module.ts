import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { MailModule } from '../mail/mail.module'
import { CustomersController } from './customers.controller'
import { CustomersService } from './customers.service'

@Module({
  imports: [ConfigModule, MailModule],
  controllers: [CustomersController],
  providers: [CustomersService, ActivityLogService],
  exports: [CustomersService],
})
export class CustomersModule {}
