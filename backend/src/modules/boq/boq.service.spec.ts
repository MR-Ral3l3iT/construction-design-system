import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { BOQService } from './boq.service'
import { PrismaService } from '../../database/prisma.service'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { prismaMock } from '../../../test/prisma-mock'

const makeBOQ = (overrides = {}) => ({
  id: 1,
  projectId: 1,
  code: 'BOQ-2026-001',
  title: 'Test BOQ',
  status: 'DRAFT',
  version: 1,
  isLocked: false,
  materialCost: '0',
  laborCost: '0',
  overheadCost: '0',
  profit: '0',
  totalAmount: '0',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makeCategory = (overrides = {}) => ({
  id: 1,
  boqId: 1,
  name: 'งานโครงสร้าง',
  sortOrder: 0,
  subCategories: [],
  ...overrides,
})

const makeItem = (overrides = {}) => ({
  id: 1,
  categoryId: 1,
  name: 'เหล็กเส้น',
  unit: 'กก.',
  quantity: '100',
  materialPrice: '25',
  laborPrice: '5',
  ...overrides,
})

describe('BOQService', () => {
  let service: BOQService
  let prisma: ReturnType<typeof prismaMock>

  beforeEach(async () => {
    prisma = prismaMock()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BOQService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogService, useValue: { write: jest.fn() } },
      ],
    }).compile()
    service = module.get<BOQService>(BOQService)
  })

  describe('findOne', () => {
    it('should return BOQ with categories and items', async () => {
      prisma.bOQ.findFirst.mockResolvedValue(makeBOQ({ categories: [makeCategory()] }))

      const result = await service.findOne(1)

      expect(result.id).toBe(1)
      expect(result.code).toBe('BOQ-2026-001')
    })

    it('should throw NotFoundException when BOQ not found', async () => {
      prisma.bOQ.findFirst.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateStatus', () => {
    it('should reject invalid status transition', async () => {
      prisma.bOQ.findFirst.mockResolvedValue(makeBOQ({ status: 'DRAFT' }))

      // DRAFT → APPROVED is not a valid transition
      await expect(service.updateStatus(1, { status: 'APPROVED' } as any, 1)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should allow valid DRAFT → REVIEW transition', async () => {
      prisma.bOQ.findFirst.mockResolvedValue(makeBOQ({ status: 'DRAFT' }))
      prisma.bOQ.update.mockResolvedValue(makeBOQ({ status: 'REVIEW' }))

      const result = await service.updateStatus(1, { status: 'REVIEW' } as any, 1)

      expect(result.status).toBe('REVIEW')
    })
  })

  describe('BOQ calculation logic', () => {
    it('recalcTotal should compute materialCost + laborCost + overhead + profit', async () => {
      // item: qty=100, mat=25, lab=5 → mat=2500, lab=500
      // overhead=200, profit=300 → total=3500
      prisma.bOQCategory.findMany.mockResolvedValue([
        makeCategory({
          subCategories: [
            { id: 1, items: [makeItem({ quantity: '100', materialPrice: '25', laborPrice: '5' })] },
          ],
        }),
      ])
      prisma.bOQ.findUnique.mockResolvedValue(
        makeBOQ({ overheadCost: '200', profit: '300' }) as any,
      )
      prisma.bOQ.update.mockResolvedValue(makeBOQ())

      // Call via addItem path which calls recalcTotal internally
      prisma.bOQSubCategory.findUnique.mockResolvedValue({ category: { boqId: 1 } })
      prisma.bOQ.findFirst.mockResolvedValue(makeBOQ())
      prisma.bOQItem.create.mockResolvedValue(makeItem())

      await service.addItem(1, {
        name: 'เหล็ก',
        unit: 'กก.',
        quantity: 100,
        materialPrice: 25,
        laborPrice: 5,
      } as any)

      expect(prisma.bOQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            materialCost: '2500',
            laborCost: '500',
            totalAmount: '3500',
          }),
        }),
      )
    })
  })

  describe('addCategory', () => {
    it('should reject if BOQ is locked', async () => {
      prisma.bOQ.findFirst.mockResolvedValue(makeBOQ({ isLocked: true }))

      await expect(service.addCategory(1, { name: 'New Cat' } as any, 1)).rejects.toThrow(
        BadRequestException,
      )
    })
  })
})
