import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  CreatePaymentMilestoneDto,
  FromSubQuotationDto,
  ImportFromEstimateDto,
  MarkPaidDto,
  UpdatePaymentMilestoneDto,
} from './dto/payment.dto'
import { PaymentsService } from './payments.service'

@ApiBearerAuth()
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Permissions('payment.update')
  @ApiOperation({ summary: 'สร้างงวดเงิน' })
  create(@Body() dto: CreatePaymentMilestoneDto, @CurrentUser() user: RequestUser) {
    return this.paymentsService.create(dto, user.id)
  }

  @Post('from-sub-quotation/:subQuotationId')
  @Permissions('payment.update')
  @ApiOperation({ summary: 'สร้างงวดเงินจากใบเสนอราคาย่อย' })
  createFromSubQuotation(
    @Param('subQuotationId', ParseIntPipe) subQuotationId: number,
    @Body() dto: FromSubQuotationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.createFromSubQuotation(subQuotationId, dto.dueDate, user.id)
  }

  @Post('import-from-estimate')
  @Permissions('payment.update')
  @ApiOperation({ summary: 'นำเข้างวดเงินจากใบเสนอราคาที่อนุมัติแล้ว' })
  importFromEstimate(@Body() dto: ImportFromEstimateDto, @CurrentUser() user: RequestUser) {
    return this.paymentsService.importFromEstimate(dto.projectId, dto.estimateId, user.id)
  }

  @Get('project/:projectId')
  @Permissions('payment.view')
  @ApiOperation({ summary: 'รายการงวดเงินของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.findAllByProject(projectId, pagination)
  }

  @Get('project/:projectId/summary')
  @Permissions('payment.view')
  @ApiOperation({ summary: 'สรุปงวดเงินของโครงการ' })
  summary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.paymentsService.summary(projectId)
  }

  @Get('overview')
  @Permissions('payment.view')
  @ApiOperation({ summary: 'ภาพรวมงวดเงินทุกโครงการ' })
  findProjectsOverview(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.paymentsService.findProjectsOverview(pagination, search)
  }

  @Get(':id')
  @Permissions('payment.view')
  @ApiOperation({ summary: 'ดูรายละเอียดงวดเงิน' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id)
  }

  @Patch(':id')
  @Permissions('payment.update')
  @ApiOperation({ summary: 'แก้ไขงวดเงิน' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentMilestoneDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.update(id, dto, user.id)
  }

  @Patch(':id/paid')
  @Permissions('payment.update')
  @ApiOperation({ summary: 'บันทึกการจ่ายเงิน' })
  markPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkPaidDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.paymentsService.markPaid(id, dto, user.id)
  }
}
