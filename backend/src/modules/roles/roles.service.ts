import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto'

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    })
    if (!role) throw new NotFoundException('ไม่พบ role')
    return role
  }

  async updatePermissions(id: number, dto: UpdateRolePermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id } })
    if (!role) throw new NotFoundException('ไม่พบ role')

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: dto.permissionKeys }, isActive: true },
    })

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      ...permissions.map((p) =>
        this.prisma.rolePermission.create({ data: { roleId: id, permissionId: p.id } }),
      ),
    ])

    return this.findOne(id)
  }
}
