import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { round4 } from '../../common/utils/money.util'
import { PrismaService } from '../../database/prisma.service'
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  UpdateCompanyProfileDto,
} from './dto/company.dto'

const BANK_SELECT = {
  id: true,
  name: true,
  bankName: true,
  branchName: true,
  accountType: true,
  accountName: true,
  accountNo: true,
  isDefault: true,
  isActive: true,
  sortOrder: true,
} satisfies Prisma.BankAccountSelect

const COMPANY_SELECT = {
  id: true,
  code: true,
  name: true,
  branchName: true,
  branchCode: true,
  taxId: true,
  address: true,
  contactLine: true,
  phone: true,
  email: true,
  website: true,
  logoUrl: true,
  signatureUrl: true,
  signatureName: true,
  isVatRegistered: true,
  defaultVatRate: true,
  createdAt: true,
  updatedAt: true,
  bankAccounts: {
    where: { deletedAt: null },
    select: BANK_SELECT,
    orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.CompanyProfileSelect

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  /**
   * ระบบนี้ออกเอกสารในนามบริษัทเดียว (ฃวด) จึงไม่มี company selector —
   * ทุกที่ที่ต้องใช้ข้อมูลผู้ขายเรียกผ่านเมธอดนี้
   */
  async getProfile() {
    const company = await this.prisma.companyProfile.findFirst({
      where: { deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
      select: COMPANY_SELECT,
    })
    if (!company) {
      throw new NotFoundException('ยังไม่ได้ตั้งค่าข้อมูลบริษัท — รัน prisma db seed ก่อน')
    }
    return company
  }

  async updateProfile(dto: UpdateCompanyProfileDto, actorId: number) {
    const current = await this.getProfile()

    const updated = await this.prisma.companyProfile.update({
      where: { id: current.id },
      data: {
        name: dto.name,
        branchName: dto.branchName,
        branchCode: dto.branchCode,
        taxId: dto.taxId,
        address: dto.address,
        contactLine: dto.contactLine,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        logoUrl: dto.logoUrl,
        signatureUrl: dto.signatureUrl,
        signatureName: dto.signatureName,
        isVatRegistered: dto.isVatRegistered,
        ...(dto.defaultVatPercent !== undefined && {
          defaultVatRate: round4(dto.defaultVatPercent / 100),
        }),
      },
      select: COMPANY_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'company.updated',
      targetType: 'CompanyProfile',
      targetId: current.id,
    })

    return updated
  }

  async listBankAccounts() {
    const company = await this.getProfile()
    return company.bankAccounts
  }

  async createBankAccount(dto: CreateBankAccountDto, actorId: number) {
    const company = await this.getProfile()

    const account = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await this.clearDefault(tx, company.id)
      return tx.bankAccount.create({
        data: {
          companyId: company.id,
          name: dto.name,
          bankName: dto.bankName,
          branchName: dto.branchName,
          accountType: dto.accountType ?? 'ออมทรัพย์',
          accountName: dto.accountName,
          accountNo: dto.accountNo,
          // บัญชีแรกของบริษัทเป็น default เสมอ ไม่งั้นเอกสารจะไม่มีบัญชีให้พิมพ์
          isDefault: dto.isDefault ?? company.bankAccounts.length === 0,
          sortOrder: dto.sortOrder ?? company.bankAccounts.length,
        },
        select: BANK_SELECT,
      })
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'company.bank_account_created',
      targetType: 'BankAccount',
      targetId: account.id,
    })

    return account
  }

  async updateBankAccount(id: number, dto: UpdateBankAccountDto, actorId: number) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, companyId: true },
    })
    if (!existing) throw new NotFoundException('ไม่พบบัญชีธนาคาร')

    const account = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await this.clearDefault(tx, existing.companyId)
      return tx.bankAccount.update({
        where: { id },
        data: {
          name: dto.name,
          bankName: dto.bankName,
          branchName: dto.branchName,
          accountType: dto.accountType,
          accountName: dto.accountName,
          accountNo: dto.accountNo,
          isDefault: dto.isDefault,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
        select: BANK_SELECT,
      })
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'company.bank_account_updated',
      targetType: 'BankAccount',
      targetId: id,
    })

    return account
  }

  async removeBankAccount(id: number, actorId: number) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, companyId: true, isDefault: true },
    })
    if (!existing) throw new NotFoundException('ไม่พบบัญชีธนาคาร')

    if (existing.isDefault) {
      const others = await this.prisma.bankAccount.count({
        where: { companyId: existing.companyId, deletedAt: null, id: { not: id } },
      })
      if (others > 0) {
        throw new BadRequestException('ตั้งบัญชีอื่นเป็นบัญชีหลักก่อนจึงจะลบบัญชีนี้ได้')
      }
    }

    await this.prisma.bankAccount.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'company.bank_account_deleted',
      targetType: 'BankAccount',
      targetId: id,
    })

    return { success: true }
  }

  private clearDefault(tx: Prisma.TransactionClient, companyId: number) {
    return tx.bankAccount.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false },
    })
  }
}
