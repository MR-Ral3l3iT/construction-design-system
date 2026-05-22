import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../database/prisma.service'
import { buildPaginationMeta, paginationSkipTake } from '../../common/utils/pagination.util'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserFilterDto } from './dto/user-filter.dto'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  status: true,
  createdAt: true,
  deletedAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
} as const

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async findAll(filter: UserFilterDto) {
    const { page, pageSize, search, status, role } = filter
    const { skip, take } = paginationSkipTake(page, pageSize)

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(role && { roles: { some: { role: { name: role } } } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(page, pageSize, totalItems) }
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    })
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งาน')
    return user
  }

  async create(dto: CreateUserDto, actorId?: number) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) throw new ConflictException('อีเมลนี้มีในระบบแล้ว')

    const hash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hash,
        phone: dto.phone,
        ...(dto.roleIds?.length && {
          roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
        }),
      },
      select: USER_SELECT,
    })

    await this.activityLog.write({
      action: 'user.created',
      module: 'user',
      refId: user.id,
      userId: actorId,
      description: `สร้างผู้ใช้ ${user.email}`,
    })

    return user
  }

  async update(id: number, dto: UpdateUserDto, actorId?: number) {
    await this.findOne(id)

    const data: Record<string, unknown> = {}
    if (dto.name) data.name = dto.name
    if (dto.phone !== undefined) data.phone = dto.phone
    if (dto.avatar !== undefined) data.avatar = dto.avatar
    if (dto.status) data.status = dto.status
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12)

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data })

      if (dto.roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } })
        if (dto.roleIds.length) {
          await tx.userRole.createMany({
            data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
            skipDuplicates: true,
          })
        }
      }
    })

    await this.activityLog.write({
      action: 'user.updated',
      module: 'user',
      refId: id,
      userId: actorId,
    })

    return this.findOne(id)
  }

  async remove(id: number, actorId?: number) {
    await this.findOne(id)
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })
    await this.activityLog.write({
      action: 'user.deleted',
      module: 'user',
      refId: id,
      userId: actorId,
    })
    return { message: 'ลบผู้ใช้งานสำเร็จ' }
  }
}
