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
  CreateEstimateDto,
  CreateEstimateItemDto,
  UpdateEstimateItemDto,
  UpsertInstallmentsDto,
  UpsertScheduleDto,
} from './dto/create-estimate.dto'
import {
  ReversePriceDto,
  UpdateEstimateDto,
  UpdateEstimateStatusDto,
} from './dto/update-estimate.dto'
import { EstimatesService } from './estimates.service'

@ApiBearerAuth()
@ApiTags('Estimates')
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post()
  @Permissions('estimate.create')
  @ApiOperation({ summary: 'สร้างใบประเมิน' })
  create(@Body() dto: CreateEstimateDto, @CurrentUser() user: RequestUser) {
    return this.estimatesService.create(dto, user.id)
  }

  @Get()
  @Permissions('estimate.view')
  @ApiOperation({ summary: 'รายการใบประเมินทั้งหมด (พร้อมค้นหา)' })
  findAll(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.estimatesService.findAll(pagination, search)
  }

  @Get('overview')
  @Permissions('estimate.view')
  @ApiOperation({ summary: 'ภาพรวมใบประเมินทุกโครงการ' })
  findProjectsOverview(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.estimatesService.findProjectsOverview(pagination, search)
  }

  @Get('project/:projectId')
  @Permissions('estimate.view')
  @ApiOperation({ summary: 'รายการใบประเมินของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.estimatesService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('estimate.view')
  @ApiOperation({ summary: 'ดูรายละเอียดใบประเมิน' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.estimatesService.findOneWithSummary(id)
  }

  @Patch(':id')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'แก้ไขใบประเมิน (DRAFT เท่านั้น)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstimateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.estimatesService.update(id, dto, user.id)
  }

  @Post(':id/reverse-price')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'คิดย้อนราคาจากยอดที่ลูกค้าจะจ่าย (apply=false ดูผลก่อน)' })
  reversePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReversePriceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.estimatesService.reversePrice(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'เปลี่ยนสถานะใบประเมิน' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstimateStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.estimatesService.updateStatus(id, dto, user.id)
  }

  @Post(':id/items')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'เพิ่มรายการในใบประเมิน' })
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEstimateItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.estimatesService.addItem(id, dto, user.id)
  }

  @Patch(':id/items/:itemId')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'แก้ไขรายการในใบประเมิน' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateEstimateItemDto,
  ) {
    return this.estimatesService.updateItem(id, itemId, dto)
  }

  @Patch(':id/installments')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'บันทึกรอบจ่ายเงิน (replace all)' })
  upsertInstallments(@Param('id', ParseIntPipe) id: number, @Body() body: UpsertInstallmentsDto) {
    return this.estimatesService.upsertInstallments(id, body.installments)
  }

  @Get(':id/schedule-print')
  @Permissions('estimate.view')
  @ApiOperation({ summary: 'ข้อมูลหน้าพิมพ์แผนงานแยก (schedule ล่าสุด)' })
  schedulePrint(@Param('id', ParseIntPipe) id: number) {
    return this.estimatesService.schedulePrint(id)
  }

  @Patch(':id/schedule')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'บันทึก schedule ของใบเสนอราคา (replace all)' })
  upsertSchedule(@Param('id', ParseIntPipe) id: number, @Body() body: UpsertScheduleDto) {
    return this.estimatesService.upsertSchedule(id, body.phases)
  }

  @Delete(':id')
  @Permissions('estimate.delete')
  @ApiOperation({ summary: 'ลบใบประเมิน (DRAFT เท่านั้น)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.estimatesService.remove(id, user.id)
  }

  @Delete(':id/items/:itemId')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'ลบรายการในใบประเมิน' })
  removeItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.estimatesService.removeItem(id, itemId)
  }
}
