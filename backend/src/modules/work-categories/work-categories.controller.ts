import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { CreateWorkCategoryDto, UpdateWorkCategoryDto } from './dto/work-category.dto'
import { WorkCategoriesService } from './work-categories.service'

@ApiBearerAuth()
@ApiTags('Work Categories')
@Controller('work-categories')
export class WorkCategoriesController {
  constructor(private readonly service: WorkCategoriesService) {}

  @Get()
  @Permissions('daily.view')
  @ApiOperation({ summary: 'รายการหมวดงานที่ใช้งาน' })
  findAll() {
    return this.service.findAll()
  }

  @Get('all')
  @Permissions('daily.view')
  @ApiOperation({ summary: 'รายการหมวดงานทั้งหมด (admin)' })
  findAllAdmin() {
    return this.service.findAllAdmin()
  }

  @Get(':id')
  @Permissions('daily.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Permissions('daily.create')
  create(@Body() dto: CreateWorkCategoryDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @Permissions('daily.create')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkCategoryDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Permissions('daily.create')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
