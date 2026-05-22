import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    })

    if (!user) throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('บัญชีถูกระงับการใช้งาน')

    const isMatch = await bcrypt.compare(dto.password, user.password)
    if (!isMatch) throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง')

    const roles = user.roles.map((ur) => ur.role.name)
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    ]

    const accessToken = this.signAccessToken(user.id, user.email)
    const refreshToken = this.signRefreshToken(user.id, user.email)

    await this.activityLog.write({
      action: 'auth.login',
      module: 'auth',
      userId: user.id,
      description: `${user.email} เข้าสู่ระบบ`,
    })

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        roles,
        permissions,
      },
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    }
  }

  async refresh(userId: number, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    })
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('ไม่สามารถต่ออายุ token ได้')
    }

    return {
      accessToken: this.signAccessToken(userId, email),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    }
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: { select: { permission: { select: { key: true } } } },
              },
            },
          },
        },
      },
    })

    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งาน')

    const roles = user.roles.map((ur) => ur.role.name)
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    ]

    return { ...user, roles, permissions }
  }

  private signAccessToken(userId: number, email: string) {
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      },
    )
  }

  private signRefreshToken(userId: number, email: string) {
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    )
  }
}
