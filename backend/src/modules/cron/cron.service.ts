import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ทุกคืนเที่ยงคืน: ตรวจ payment ที่ UNPAID และ dueDate ผ่านแล้ว → OVERDUE
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverduePayments() {
    const now = new Date()
    const { count } = await this.prisma.paymentMilestone.updateMany({
      where: {
        deletedAt: null,
        status: 'UNPAID',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    })

    if (count > 0) {
      this.logger.log(`Marked ${count} payment milestone(s) as OVERDUE`)
    }
  }
}
