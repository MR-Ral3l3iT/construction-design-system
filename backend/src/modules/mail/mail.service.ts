import { Injectable, Logger } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'

export interface QuotationApprovedContext {
  customerName: string
  projectName: string
  quotationCode: string
  amount: string
  appUrl: string
}

export interface PaymentDueContext {
  customerName: string
  projectName: string
  milestoneTitle: string
  amount: string
  dueDate: string
  appUrl: string
}

export interface CredentialsContext {
  customerName: string
  email: string
  appUrl: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly enabled: boolean

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    this.enabled = !!(config.get('SMTP_USER') && config.get('SMTP_PASS'))
    if (!this.enabled) {
      this.logger.warn('Email service disabled — SMTP_USER or SMTP_PASS not set')
    }
  }

  async sendQuotationApproved(to: string, ctx: QuotationApprovedContext) {
    if (!this.enabled) return
    try {
      await this.mailer.sendMail({
        to,
        subject: `[${ctx.projectName}] ใบเสนอราคา ${ctx.quotationCode} ได้รับการอนุมัติแล้ว`,
        template: 'quotation-approved',
        context: ctx,
      })
    } catch (err) {
      this.logger.error('sendQuotationApproved failed', err)
    }
  }

  async sendPaymentDue(to: string, ctx: PaymentDueContext) {
    if (!this.enabled) return
    try {
      await this.mailer.sendMail({
        to,
        subject: `[${ctx.projectName}] แจ้งเตือนงวดชำระ ${ctx.milestoneTitle} ครบกำหนด`,
        template: 'payment-due',
        context: ctx,
      })
    } catch (err) {
      this.logger.error('sendPaymentDue failed', err)
    }
  }

  async sendCredentials(to: string, ctx: CredentialsContext) {
    if (!this.enabled) return
    try {
      await this.mailer.sendMail({
        to,
        subject: 'ข้อมูลเข้าสู่ระบบ Client Portal',
        template: 'credentials',
        context: ctx,
      })
    } catch (err) {
      this.logger.error('sendCredentials failed', err)
    }
  }

  async sendGeneric(to: string, subject: string, html: string) {
    if (!this.enabled) return
    try {
      await this.mailer.sendMail({ to, subject, html })
    } catch (err) {
      this.logger.error('sendGeneric failed', err)
    }
  }
}
