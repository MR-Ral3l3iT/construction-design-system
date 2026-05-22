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
import { CreateEstimateDto, CreateEstimateItemDto } from './dto/create-estimate.dto'
import { UpdateEstimateDto, UpdateEstimateStatusDto } from './dto/update-estimate.dto'
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
    return this.estimatesService.findOne(id)
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
    @Body() dto: Partial<CreateEstimateItemDto>,
  ) {
    return this.estimatesService.updateItem(id, itemId, dto)
  }

  @Patch(':id/installments')
  @Permissions('estimate.update')
  @ApiOperation({ summary: 'บันทึกรอบจ่ายเงิน (replace all)' })
  upsertInstallments(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      installments: {
        installmentNo: number
        description: string
        percentage: string
        amount: string
      }[]
    },
  ) {
    return this.estimatesService.upsertInstallments(id, body.installments)
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
