import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateWorkCategoryDto, UpdateWorkCategoryDto } from './dto/work-category.dto'

@Injectable()
export class WorkCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.workCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })
  }

  findAllAdmin() {
    return this.prisma.workCategory.findMany({ orderBy: { order: 'asc' } })
  }

  async findOne(id: number) {
    const cat = await this.prisma.workCategory.findUnique({ where: { id } })
    if (!cat) throw new NotFoundException('ไม่พบหมวดงาน')
    return cat
  }

  create(dto: CreateWorkCategoryDto) {
    return this.prisma.workCategory.create({ data: dto })
  }

  async update(id: number, dto: UpdateWorkCategoryDto) {
    await this.findOne(id)
    return this.prisma.workCategory.update({ where: { id }, data: dto })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.workCategory.update({ where: { id }, data: { isActive: false } })
  }
}
