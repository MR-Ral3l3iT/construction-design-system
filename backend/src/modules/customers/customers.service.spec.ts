import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CustomersService } from './customers.service'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { MailService } from '../mail/mail.service'
import { prismaMock } from '../../../test/prisma-mock'

const makeCustomer = (overrides = {}) => ({
  id: 1,
  type: 'INDIVIDUAL',
  name: 'สมชาย ใจดี',
  companyName: null,
  email: 'somchai@test.com',
  phone: '0812345678',
  lineId: null,
  address: null,
  province: null,
  note: null,
  leadStatus: 'INTERESTED',
  userId: null,
  user: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { projects: 0 },
  ...overrides,
})

describe('CustomersService', () => {
  let service: CustomersService
  let prisma: ReturnType<typeof prismaMock>
  const activityLog = { write: jest.fn() }

  beforeEach(async () => {
    prisma = prismaMock()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogService, useValue: activityLog },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3003') },
        },
        { provide: MailService, useValue: { sendCredentials: jest.fn() } },
      ],
    }).compile()
    service = module.get<CustomersService>(CustomersService)
    activityLog.write.mockClear()
  })

  describe('create', () => {
    it('should create customer and log activity', async () => {
      const dto = { name: 'สมชาย ใจดี', type: 'INDIVIDUAL' as const }
      prisma.customer.create.mockResolvedValue(makeCustomer())

      const result = await service.create(dto as any, 1)

      expect(prisma.customer.create).toHaveBeenCalledTimes(1)
      expect(activityLog.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.created' }),
      )
      expect(result.name).toBe('สมชาย ใจดี')
    })
  })

  describe('findOne', () => {
    it('should return customer with projects', async () => {
      prisma.customer.findFirst.mockResolvedValue(makeCustomer({ projects: [] }))

      const result = await service.findOne(1)

      expect(result.id).toBe(1)
      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, deletedAt: null } }),
      )
    })

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update customer fields', async () => {
      prisma.customer.findFirst.mockResolvedValue(makeCustomer({ projects: [] }))
      prisma.customer.update.mockResolvedValue(makeCustomer({ note: 'updated note' }))

      const result = await service.update(1, { note: 'updated note' } as any, 1)

      expect(prisma.customer.update).toHaveBeenCalledTimes(1)
      expect(activityLog.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.updated' }),
      )
      expect(result.note).toBe('updated note')
    })
  })

  describe('updateLeadStatus', () => {
    it('should change lead status', async () => {
      prisma.customer.findFirst.mockResolvedValue(makeCustomer({ projects: [] }))
      prisma.customer.update.mockResolvedValue(makeCustomer({ leadStatus: 'SITE_VISIT' }))

      const result = await service.updateLeadStatus(1, { leadStatus: 'SITE_VISIT' as any }, 1)

      expect(result.leadStatus).toBe('SITE_VISIT')
      expect(activityLog.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.lead_status_changed' }),
      )
    })
  })

  describe('remove', () => {
    it('should soft-delete customer', async () => {
      prisma.customer.findFirst.mockResolvedValue(makeCustomer({ projects: [] }))
      prisma.customer.update.mockResolvedValue(makeCustomer())

      await service.remove(1, 1)

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated results', async () => {
      prisma.customer.findMany.mockResolvedValue([makeCustomer()])
      prisma.customer.count.mockResolvedValue(1)

      const result = await service.findAll({ page: 1, pageSize: 10 } as any)

      expect(result.data).toHaveLength(1)
      expect(result.meta.totalItems).toBe(1)
    })
  })
})
