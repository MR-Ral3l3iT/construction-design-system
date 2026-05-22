import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { ApprovalsService } from './approvals.service'
import { CreateApprovalDto } from './dto/create-approval.dto'
import { DecideApprovalDto } from './dto/decide-approval.dto'

@ApiBearerAuth()
@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @Permissions('approval.create')
  @ApiOperation({ summary: 'สร้างคำขออนุมัติ' })
  create(@Body() dto: CreateApprovalDto, @CurrentUser() user: RequestUser) {
    return this.approvalsService.create(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('approval.view')
  @ApiOperation({ summary: 'รายการ approval ของโครงการ' })
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.approvalsService.findByProject(projectId)
  }

  @Get('pending')
  @Permissions('approval.view')
  @ApiOperation({ summary: 'รายการ approval ที่รออนุมัติ' })
  findPending(@Query('projectId') projectId?: string) {
    return this.approvalsService.findPending(projectId ? parseInt(projectId) : undefined)
  }

  @Patch(':id/approve')
  @Permissions('approval.decide')
  @ApiOperation({ summary: 'อนุมัติ' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.approvalsService.approve(id, dto, user.id)
  }

  @Patch(':id/reject')
  @Permissions('approval.decide')
  @ApiOperation({ summary: 'ปฏิเสธ' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.approvalsService.reject(id, dto, user.id)
  }
}
