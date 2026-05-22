import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../../database/prisma.service'
import { RequestUser } from '../../../common/decorators/current-user.decorator'

interface JwtPayload {
  sub: number
  email: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
        customer: { select: { id: true } },
      },
    })

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('บัญชีผู้ใช้ไม่สามารถใช้งานได้')
    }

    const roles = user.roles.map((ur) => ur.role.name)
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    ]

    return { id: user.id, email: user.email, roles, permissions, customerId: user.customer?.id }
  }
}
