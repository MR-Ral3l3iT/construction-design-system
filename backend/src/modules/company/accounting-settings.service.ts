import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AccountType, Prisma } from '@prisma/client'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { round4 } from '../../common/utils/money.util'
import { PrismaService } from '../../database/prisma.service'
import {
  CloseFiscalPeriodDto,
  CreateChartOfAccountDto,
  CreateWhtRateDto,
  UpdateChartOfAccountDto,
  UpdateWhtRateDto,
} from './dto/accounting-settings.dto'

const ACCOUNT_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  parentId: true,
  isActive: true,
  sortOrder: true,
} satisfies Prisma.ChartOfAccountSelect

type AccountRow = Prisma.ChartOfAccountGetPayload<{ select: typeof ACCOUNT_SELECT }>
type AccountNode = AccountRow & { children: AccountNode[] }

@Injectable()
export class AccountingSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  // ─── Chart of Accounts ──────────────────────────────────────────────────

  /** คืนเป็น tree เพราะหน้าตั้งค่าแสดงผังบัญชีแบบซ้อนชั้น (4000 → 4100) */
  async listAccounts(type?: AccountType, includeInactive = false) {
    const rows = await this.prisma.chartOfAccount.findMany({
      where: {
        deletedAt: null,
        ...(type && { type }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: ACCOUNT_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    })

    const nodes = new Map<number, AccountNode>(rows.map((r) => [r.id, { ...r, children: [] }]))
    const roots: AccountNode[] = []
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined
      // บัญชีที่แม่ถูกกรองออก (คนละ type หรือถูกปิด) ให้โผล่เป็น root แทนที่จะหายไปเงียบ ๆ
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
    return roots
  }

  /** รายการแบน ๆ สำหรับ dropdown เลือกบัญชีตอนบันทึกรายการ */
  async listAccountOptions(type?: AccountType) {
    return this.prisma.chartOfAccount.findMany({
      where: { deletedAt: null, isActive: true, ...(type && { type }) },
      select: { id: true, code: true, name: true, type: true },
      orderBy: { code: 'asc' },
    })
  }

  async createAccount(dto: CreateChartOfAccountDto, actorId: number) {
    const duplicate = await this.prisma.chartOfAccount.findUnique({
      where: { code: dto.code },
      select: { id: true },
    })
    if (duplicate) throw new BadRequestException(`รหัสบัญชี ${dto.code} ถูกใช้แล้ว`)

    if (dto.parentId) await this.assertAccountExists(dto.parentId)

    const account = await this.prisma.chartOfAccount.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: ACCOUNT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.account_created',
      targetType: 'ChartOfAccount',
      targetId: account.id,
    })

    return account
  }

  async updateAccount(id: number, dto: UpdateChartOfAccountDto, actorId: number) {
    await this.assertAccountExists(id)

    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('บัญชีเป็นบัญชีแม่ของตัวเองไม่ได้')
      await this.assertAccountExists(dto.parentId)
      await this.assertNotDescendant(id, dto.parentId)
    }

    const account = await this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
      select: ACCOUNT_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.account_updated',
      targetType: 'ChartOfAccount',
      targetId: id,
    })

    return account
  }

  async removeAccount(id: number, actorId: number) {
    await this.assertAccountExists(id)

    const childCount = await this.prisma.chartOfAccount.count({
      where: { parentId: id, deletedAt: null },
    })
    if (childCount > 0) {
      throw new BadRequestException('ลบไม่ได้ — ยังมีบัญชีย่อยอยู่ใต้บัญชีนี้')
    }

    await this.prisma.chartOfAccount.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.account_deleted',
      targetType: 'ChartOfAccount',
      targetId: id,
    })

    return { success: true }
  }

  private async assertAccountExists(id: number) {
    const found = await this.prisma.chartOfAccount.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!found) throw new NotFoundException('ไม่พบบัญชีในผังบัญชี')
  }

  /** กันย้ายบัญชีแม่ไปอยู่ใต้ลูกตัวเอง ซึ่งจะทำให้ tree วนลูป */
  private async assertNotDescendant(id: number, candidateParentId: number) {
    let cursor: number | null = candidateParentId
    const seen = new Set<number>()
    while (cursor) {
      if (cursor === id) throw new BadRequestException('ย้ายบัญชีไปอยู่ใต้บัญชีลูกของตัวเองไม่ได้')
      if (seen.has(cursor)) break
      seen.add(cursor)
      const parent: { parentId: number | null } | null =
        await this.prisma.chartOfAccount.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        })
      cursor = parent?.parentId ?? null
    }
  }

  // ─── WHT Rates ──────────────────────────────────────────────────────────

  async listWhtRates(includeInactive = false) {
    const rows = await this.prisma.whtRate.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    })
    // แนบ percent มาให้ frontend ไม่ต้องคูณ 100 เองทุกที่
    return rows.map((r) => ({ ...r, percent: Number(r.rate) * 100 }))
  }

  async createWhtRate(dto: CreateWhtRateDto, actorId: number) {
    const duplicate = await this.prisma.whtRate.findUnique({
      where: { code: dto.code },
      select: { id: true },
    })
    if (duplicate) throw new BadRequestException(`รหัส ${dto.code} ถูกใช้แล้ว`)

    const rate = await this.prisma.whtRate.create({
      data: {
        code: dto.code,
        rate: round4(dto.percent / 100),
        description: dto.description,
        section: dto.section,
        sortOrder: dto.sortOrder ?? 0,
      },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.wht_rate_created',
      targetType: 'WhtRate',
      targetId: rate.id,
    })

    return { ...rate, percent: Number(rate.rate) * 100 }
  }

  async updateWhtRate(id: number, dto: UpdateWhtRateDto, actorId: number) {
    const existing = await this.prisma.whtRate.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundException('ไม่พบอัตราหัก ณ ที่จ่าย')

    const rate = await this.prisma.whtRate.update({
      where: { id },
      data: {
        ...(dto.percent !== undefined && { rate: round4(dto.percent / 100) }),
        description: dto.description,
        section: dto.section,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.wht_rate_updated',
      targetType: 'WhtRate',
      targetId: id,
    })

    return { ...rate, percent: Number(rate.rate) * 100 }
  }

  // ─── Fiscal Periods ─────────────────────────────────────────────────────

  async listFiscalPeriods(year?: number) {
    return this.prisma.fiscalPeriod.findMany({
      where: year ? { year } : {},
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
  }

  /** ปิดงวด — ใช้กันบันทึกรายการย้อนหลังหลังยื่นภาษีไปแล้ว */
  async closeFiscalPeriod(dto: CloseFiscalPeriodDto, actorId: number) {
    const existing = await this.prisma.fiscalPeriod.findUnique({
      where: { year_month: { year: dto.year, month: dto.month } },
    })
    if (existing?.isClosed) {
      throw new BadRequestException(`งวด ${dto.month}/${dto.year} ปิดไปแล้ว`)
    }

    const period = await this.prisma.fiscalPeriod.upsert({
      where: { year_month: { year: dto.year, month: dto.month } },
      create: {
        year: dto.year,
        month: dto.month,
        isClosed: true,
        closedAt: new Date(),
        closedById: actorId,
        note: dto.note,
      },
      update: { isClosed: true, closedAt: new Date(), closedById: actorId, note: dto.note },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.period_closed',
      targetType: 'FiscalPeriod',
      targetId: period.id,
      metadata: { year: dto.year, month: dto.month },
    })

    return period
  }

  async reopenFiscalPeriod(id: number, actorId: number) {
    const existing = await this.prisma.fiscalPeriod.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('ไม่พบงวดบัญชี')
    if (!existing.isClosed) throw new BadRequestException('งวดนี้ยังไม่ได้ปิด')

    const period = await this.prisma.fiscalPeriod.update({
      where: { id },
      data: { isClosed: false, closedAt: null, closedById: null },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'accounting.period_reopened',
      targetType: 'FiscalPeriod',
      targetId: id,
      metadata: { year: existing.year, month: existing.month },
    })

    return period
  }

  /** ให้โมดูลอื่นเรียกก่อนบันทึกรายการลงงวดที่อาจถูกปิดไปแล้ว */
  async assertPeriodOpen(date: Date) {
    const closed = await this.prisma.fiscalPeriod.findUnique({
      where: { year_month: { year: date.getFullYear(), month: date.getMonth() + 1 } },
      select: { isClosed: true },
    })
    if (closed?.isClosed) {
      throw new BadRequestException(
        `งวด ${date.getMonth() + 1}/${date.getFullYear()} ปิดบัญชีแล้ว บันทึกรายการย้อนหลังไม่ได้`,
      )
    }
  }
}
