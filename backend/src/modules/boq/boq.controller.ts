import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  CreateBOQCategoryDto,
  CreateBOQDto,
  CreateBOQItemDto,
  CreateBOQSubCategoryDto,
  UpdateBOQCategoryDto,
  UpdateBOQDto,
  UpdateBOQItemDto,
  UpdateBOQStatusDto,
  UpdateBOQSubCategoryDto,
} from './dto/boq.dto'
import { BOQService } from './boq.service'

@ApiBearerAuth()
@ApiTags('BOQ')
@Controller('boq')
export class BOQController {
  constructor(private readonly boqService: BOQService) {}

  @Post()
  @Permissions('boq.create')
  @ApiOperation({ summary: 'สร้าง BOQ' })
  create(@Body() dto: CreateBOQDto, @CurrentUser() user: RequestUser) {
    return this.boqService.create(dto, user.id)
  }

  @Get('project-summaries')
  @Permissions('boq.view')
  @ApiOperation({ summary: 'สรุปข้อมูล BOQ รายโครงการ' })
  getProjectSummaries() {
    return this.boqService.getProjectSummaries()
  }

  @Get('project/:projectId')
  @Permissions('boq.view')
  @ApiOperation({ summary: 'รายการ BOQ ของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.boqService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('boq.view')
  @ApiOperation({ summary: 'ดูรายละเอียด BOQ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boqService.findOne(id)
  }

  @Patch(':id')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'แก้ไข BOQ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBOQDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.boqService.update(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'เปลี่ยนสถานะ BOQ' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBOQStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.boqService.updateStatus(id, dto, user.id)
  }

  // ─── Category (หมวดงานใหญ่) ──────────────────────────────────────────────────

  @Post(':id/categories')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'เพิ่มหมวดงานใหญ่ใน BOQ' })
  addCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBOQCategoryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.boqService.addCategory(id, dto, user.id)
  }

  @Patch('categories/:categoryId')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'แก้ไขหมวดงานใหญ่ BOQ' })
  updateCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: UpdateBOQCategoryDto,
  ) {
    return this.boqService.updateCategory(categoryId, dto)
  }

  @Delete('categories/:categoryId')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'ลบหมวดงานใหญ่ BOQ' })
  deleteCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.boqService.deleteCategory(categoryId)
  }

  // ─── SubCategory (หัวข้อย่อย) ────────────────────────────────────────────────

  @Post('categories/:categoryId/sub-categories')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'เพิ่มหัวข้อย่อยใน BOQ' })
  addSubCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateBOQSubCategoryDto,
  ) {
    return this.boqService.addSubCategory(categoryId, dto)
  }

  @Patch('sub-categories/:subCategoryId')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'แก้ไขหัวข้อย่อย BOQ' })
  updateSubCategory(
    @Param('subCategoryId', ParseIntPipe) subCategoryId: number,
    @Body() dto: UpdateBOQSubCategoryDto,
  ) {
    return this.boqService.updateSubCategory(subCategoryId, dto)
  }

  @Delete('sub-categories/:subCategoryId')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'ลบหัวข้อย่อย BOQ' })
  deleteSubCategory(@Param('subCategoryId', ParseIntPipe) subCategoryId: number) {
    return this.boqService.deleteSubCategory(subCategoryId)
  }

  // ─── Item (รายการย่อย) ────────────────────────────────────────────────────────

  @Post('sub-categories/:subCategoryId/items')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'เพิ่มรายการย่อยใน BOQ' })
  addItem(
    @Param('subCategoryId', ParseIntPipe) subCategoryId: number,
    @Body() dto: CreateBOQItemDto,
  ) {
    return this.boqService.addItem(subCategoryId, dto)
  }

  @Patch('items/:itemId')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'แก้ไขรายการย่อย BOQ' })
  updateItem(@Param('itemId', ParseIntPipe) itemId: number, @Body() dto: UpdateBOQItemDto) {
    return this.boqService.updateItem(itemId, dto)
  }

  @Delete('items/:itemId')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'ลบรายการย่อย BOQ' })
  removeItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.boqService.removeItem(itemId)
  }
}
