import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import * as sharp from 'sharp'
import { ConfigService } from '@nestjs/config'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { PrismaService } from '../../database/prisma.service'
import { MailService } from '../mail/mail.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { FilterCustomerDto } from './dto/filter-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto'

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const CUSTOMER_SELECT = {
  id: true,
  type: true,
  name: true,
  companyName: true,
  taxId: true,
  email: true,
  phone: true,
  lineId: true,
  address: true,
  province: true,
  district: true,
  subdistrict: true,
  postcode: true,
  note: true,
  avatarUrl: true,
  leadStatus: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { projects: true } },
} satisfies Prisma.CustomerSelect

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name)
  private readonly uploadDir: string
  private readonly avatarDir: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads')
    this.avatarDir = path.join(this.uploadDir, 'avatars', 'customers')
    fs.mkdirSync(this.avatarDir, { recursive: true })
    this.logger.log(`Avatar storage: ${this.avatarDir}`)
  }

  async create(dto: CreateCustomerDto, actorId: number) {
    const customer = await this.prisma.customer.create({
      data: {
        type: dto.type,
        name: dto.name,
        companyName: dto.companyName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        lineId: dto.lineId,
        address: dto.address,
        province: dto.province,
        district: dto.district,
        subdistrict: dto.subdistrict,
        postcode: dto.postcode,
        note: dto.note,
        avatarUrl: dto.avatarUrl,
        ...(dto.leadStatus && { leadStatus: dto.leadStatus }),
      },
      select: CUSTOMER_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.created',
      targetType: 'Customer',
      targetId: customer.id,
    })

    return customer
  }

  async findAll(filter: FilterCustomerDto) {
    const {
      page,
      pageSize,
      search,
      type,
      leadStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(type && { type }),
      ...(leadStatus && { leadStatus }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...CUSTOMER_SELECT,
        userId: true,
        user: { select: { id: true, email: true, status: true } },
        projects: {
          where: { deletedAt: null },
          select: { id: true, code: true, name: true, status: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) throw new NotFoundException('ไม่พบข้อมูลลูกค้า')
    return customer
  }

  async update(id: number, dto: UpdateCustomerDto, actorId: number) {
    await this.findOne(id)

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        type: dto.type,
        name: dto.name,
        companyName: dto.companyName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        lineId: dto.lineId,
        address: dto.address,
        province: dto.province,
        district: dto.district,
        subdistrict: dto.subdistrict,
        postcode: dto.postcode,
        note: dto.note,
        ...(dto.leadStatus && { leadStatus: dto.leadStatus }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: CUSTOMER_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.updated',
      targetType: 'Customer',
      targetId: id,
    })

    return customer
  }

  async updateLeadStatus(id: number, dto: UpdateLeadStatusDto, actorId: number) {
    await this.findOne(id)

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        leadStatus: dto.leadStatus,
        ...(dto.note !== undefined && { note: dto.note }),
      },
      select: CUSTOMER_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.lead_status_changed',
      targetType: 'Customer',
      targetId: id,
      metadata: { leadStatus: dto.leadStatus },
    })

    return customer
  }

  async remove(id: number, actorId: number) {
    await this.findOne(id)

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.deleted',
      targetType: 'Customer',
      targetId: id,
    })
  }

  async createAccount(customerId: number, email: string, password: string, actorId: number) {
    const customer = await this.findOne(customerId)

    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว')

    let customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } })
    if (!customerRole) {
      customerRole = await this.prisma.role.create({
        data: { name: 'CUSTOMER', description: 'Client Portal User' },
      })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: {
        name: customer.name,
        email,
        password: hashed,
        status: 'ACTIVE',
        roles: { create: { roleId: customerRole.id } },
        customer: { connect: { id: customerId } },
      },
      select: { id: true, name: true, email: true, status: true },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.account_created',
      targetType: 'Customer',
      targetId: customerId,
    })

    return user
  }

  async updateAccount(
    customerId: number,
    email: string | undefined,
    password: string | undefined,
    actorId: number,
  ) {
    const customer = await this.findOne(customerId)
    if (!customer.user) throw new BadRequestException('ลูกค้านี้ยังไม่มีบัญชี Client Portal')

    if (email && email !== customer.user.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email } })
      if (conflict && conflict.id !== customer.user.id)
        throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว')
    }

    const data: Record<string, unknown> = {}
    if (email) data.email = email
    if (password) data.password = await bcrypt.hash(password, 10)

    const updated = await this.prisma.user.update({
      where: { id: customer.user.id },
      data,
      select: { id: true, name: true, email: true, status: true },
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.account_updated',
      targetType: 'Customer',
      targetId: customerId,
    })

    return updated
  }

  async deleteAccount(customerId: number, actorId: number) {
    const customer = await this.findOne(customerId)
    if (!customer.user) throw new BadRequestException('ลูกค้านี้ยังไม่มีบัญชี Client Portal')

    const userId = customer.user.id

    await this.prisma.$transaction([
      // 1. ตัด FK จาก Customer ก่อน
      this.prisma.customer.update({ where: { id: customerId }, data: { userId: null } }),
      // 2. ลบ UserRole ทั้งหมดของ user นี้
      this.prisma.userRole.deleteMany({ where: { userId } }),
      // 3. ลบ User
      this.prisma.user.delete({ where: { id: userId } }),
    ])

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.account_deleted',
      targetType: 'Customer',
      targetId: customerId,
    })

    return { message: 'ลบบัญชีสำเร็จ' }
  }

  async uploadAvatar(id: number, file: Express.Multer.File, actorId: number) {
    await this.findOne(id)

    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      throw new BadRequestException('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('ขนาดรูปภาพต้องไม่เกิน 5 MB')
    }

    // Convert to WebP (max 400×400, quality 85) to save storage
    const webpBuffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer()

    const filename = `avatar-${id}-${crypto.randomUUID()}.webp`
    const dest = path.join(this.avatarDir, filename)
    fs.writeFileSync(dest, webpBuffer)

    const baseUrl = this.config.get<string>('NEXT_PUBLIC_API_URL') ?? 'http://localhost:3004'
    const avatarUrl = `${baseUrl}/api/v1/files/avatars/${filename}`

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { avatarUrl },
      select: CUSTOMER_SELECT,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.avatar_updated',
      targetType: 'Customer',
      targetId: id,
    })

    this.logger.log(`Avatar saved: ${dest} (${Math.round(webpBuffer.length / 1024)} KB)`)
    return customer
  }

  async leadFunnelSummary() {
    const groups = await this.prisma.customer.groupBy({
      by: ['leadStatus'],
      where: { deletedAt: null },
      _count: { id: true },
    })

    return groups.map((g) => ({ leadStatus: g.leadStatus, count: g._count.id }))
  }

  async sendCredentials(customerId: number, actorId: number) {
    const customer = await this.findOne(customerId)
    if (!customer.user) throw new BadRequestException('ลูกค้านี้ยังไม่มีบัญชี Client Portal')

    const to = customer.user.email
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3003'

    await this.mail.sendCredentials(to, {
      customerName: customer.name,
      email: to,
      appUrl,
    })

    await this.activityLog.write({
      userId: actorId,
      action: 'customer.credentials_sent',
      targetType: 'Customer',
      targetId: customerId,
    })

    return { message: 'ส่งอีเมลสำเร็จ' }
  }
}
