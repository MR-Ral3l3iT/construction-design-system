import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request, Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { ConfigService } from '@nestjs/config'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_MAX_AGE_7D = 7 * 24 * 60 * 60 * 1000

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบ' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto)

    // refresh token ส่งผ่าน httpOnly cookie เพื่อป้องกัน XSS
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_7D,
      path: '/api/v1/auth',
    })

    const { refreshToken: _rt, ...response } = result
    return response
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ต่ออายุ access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE]
    if (!token) {
      res.clearCookie(REFRESH_COOKIE)
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'ไม่พบ refresh token' })
    }

    try {
      const { JwtService } = await import('@nestjs/jwt')
      // decode manually to get sub
      const jwtService = new JwtService()
      const payload = jwtService.decode(token) as { sub: number; email: string } | null
      if (!payload) throw new Error('invalid token')

      return await this.authService.refresh(payload.sub, payload.email)
    } catch {
      res.clearCookie(REFRESH_COOKIE)
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'refresh token หมดอายุ' })
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'ออกจากระบบ' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
    return { message: 'ออกจากระบบสำเร็จ' }
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'ข้อมูลผู้ใช้ปัจจุบัน' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id)
  }
}
