import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    })
  }

  findAllGrouped() {
    return this.prisma.permission
      .findMany({ where: { isActive: true }, orderBy: [{ group: 'asc' }, { key: 'asc' }] })
      .then((perms) =>
        perms.reduce<Record<string, typeof perms>>(
          (acc, p) => ({ ...acc, [p.group]: [...(acc[p.group] ?? []), p] }),
          {},
        ),
      )
  }
}
