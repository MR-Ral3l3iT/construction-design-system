import { Module } from '@nestjs/common'
import { SubQuotationController } from './sub-quotation.controller'
import { SubQuotationService } from './sub-quotation.service'
import { PrismaModule } from '../../database/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SubQuotationController],
  providers: [SubQuotationService],
  exports: [SubQuotationService],
})
export class SubQuotationModule {}
