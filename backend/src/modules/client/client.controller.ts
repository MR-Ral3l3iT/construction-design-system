import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { CustomerGuard } from '../../common/guards/customer.guard'
import { ClientService } from './client.service'

@ApiBearerAuth()
@ApiTags('Client Portal')
@UseGuards(CustomerGuard)
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('projects')
  @ApiOperation({ summary: 'รายการโครงการของลูกค้า' })
  getProjects(@CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getProjects(customerId)
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'รายละเอียดโครงการ' })
  getProject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getProject(id, customerId)
  }

  @Get('projects/:id/reports/:reportId')
  @ApiOperation({ summary: 'รายละเอียดรายงานประจำวัน' })
  getReport(
    @Param('id', ParseIntPipe) id: number,
    @Param('reportId', ParseIntPipe) reportId: number,
    @CurrentUser() user: RequestUser,
  ) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getReport(id, reportId, customerId)
  }

  @Get('projects/:id/reports')
  @ApiOperation({ summary: 'รายงานประจำวันทั้งหมด (pagination + filter)' })
  getReportsList(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getReportsList(id, customerId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      dateFrom,
      dateTo,
    })
  }

  @Get('projects/:id/latest-report')
  @ApiOperation({ summary: 'รายงานประจำวันล่าสุด' })
  getLatestReport(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getLatestDailyReport(id, customerId)
  }

  @Get('projects/:id/daily-updates')
  @ApiOperation({ summary: 'รายงานประจำวัน (เฉพาะที่ publish แล้ว)' })
  getDailyUpdates(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getDailyUpdates(id, customerId)
  }

  @Get('projects/:id/files')
  @ApiOperation({ summary: 'ไฟล์และเอกสาร' })
  getFiles(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getFiles(id, customerId)
  }

  @Get('projects/:id/payments')
  @ApiOperation({ summary: 'งวดเงิน' })
  getPayments(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getPayments(id, customerId)
  }

  @Get('projects/:id/approvals')
  @ApiOperation({ summary: 'รายการรออนุมัติ' })
  getApprovals(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const customerId = this.resolveCustomerId(user)
    return this.clientService.getApprovals(id, customerId)
  }

  private resolveCustomerId(user: RequestUser): number {
    // Admin can pass any customerId; customers use their own
    if (user.customerId) return user.customerId
    if (user.roles.includes('ADMIN')) throw new ForbiddenException('Admin ต้องระบุ customerId')
    throw new ForbiddenException('ไม่พบข้อมูลลูกค้า')
  }
}
