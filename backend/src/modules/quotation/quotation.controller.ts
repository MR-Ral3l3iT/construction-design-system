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
  CreateQuotationDto,
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
} from './dto/quotation.dto'
import { QuotationService } from './quotation.service'

@ApiBearerAuth()
@ApiTags('Quotation')
@Controller('quotation')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @Permissions('boq.create')
  @ApiOperation({ summary: 'สร้างใบเสนอราคา (optionally from BOQ)' })
  create(@Body() dto: CreateQuotationDto, @CurrentUser() user: RequestUser) {
    return this.quotationService.create(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('boq.view')
  @ApiOperation({ summary: 'รายการใบเสนอราคาของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.quotationService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('boq.view')
  @ApiOperation({ summary: 'ดูรายละเอียดใบเสนอราคา' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotationService.findOne(id)
  }

  @Patch(':id')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'แก้ไขใบเสนอราคา' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.quotationService.update(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'เปลี่ยนสถานะใบเสนอราคา' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.quotationService.updateStatus(id, dto, user.id)
  }

  @Delete(':id')
  @Permissions('boq.update')
  @ApiOperation({ summary: 'ลบใบเสนอราคา' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quotationService.remove(id)
  }
}
