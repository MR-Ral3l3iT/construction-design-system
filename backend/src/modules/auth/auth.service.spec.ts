import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { AuthService } from './auth.service'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { prismaMock } from '../../../test/prisma-mock'

const makeUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: bcrypt.hashSync('password123', 1),
  status: 'ACTIVE',
  avatar: null,
  phone: null,
  roles: [],
  customer: null,
  ...overrides,
})

describe('AuthService', () => {
  let service: AuthService
  let prisma: ReturnType<typeof prismaMock>
  let jwtService: jest.Mocked<JwtService>

  beforeEach(async () => {
    prisma = prismaMock()
    jwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    } as unknown as jest.Mocked<JwtService>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
        {
          provide: ActivityLogService,
          useValue: { write: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser())

      const result = await service.login({ email: 'test@example.com', password: 'password123' })

      expect(result.accessToken).toBeDefined()
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.roles).toEqual([])
    })

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(
        service.login({ email: 'notfound@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser())

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when account is not ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'INACTIVE' }))

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should include user roles and permissions in response', async () => {
      const userWithRole = makeUser({
        roles: [
          {
            role: {
              name: 'ADMIN',
              permissions: [{ permission: { key: 'customer.view' } }],
            },
          },
        ],
      })
      prisma.user.findUnique.mockResolvedValue(userWithRole)

      const result = await service.login({ email: 'test@example.com', password: 'password123' })

      expect(result.user.roles).toContain('ADMIN')
      expect(result.user.permissions).toContain('customer.view')
    })
  })

  describe('getMe', () => {
    it('should return user info', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...makeUser(),
        createdAt: new Date(),
        roles: [],
      })

      const result = await service.getMe(1)
      expect(result.email).toBe('test@example.com')
    })

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const { NotFoundException } = await import('@nestjs/common')
      await expect(service.getMe(999)).rejects.toThrow(NotFoundException)
    })
  })
})
