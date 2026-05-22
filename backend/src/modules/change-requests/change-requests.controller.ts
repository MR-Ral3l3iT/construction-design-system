import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import {
  ApproveChangeRequestDto,
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
  UpdateChangeRequestStatusDto,
} from './dto/change-request.dto'
import { ChangeRequestsService } from './change-requests.service'

@ApiBearerAuth()
@ApiTags('Change Requests')
@Controller('change-requests')
export class ChangeRequestsController {
  constructor(private readonly changeRequestsService: ChangeRequestsService) {}

  @Post()
  @Permissions('project.update')
  @ApiOperation({ summary: 'สร้าง Change Request' })
  create(@Body() dto: CreateChangeRequestDto, @CurrentUser() user: RequestUser) {
    return this.changeRequestsService.create(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('project.view')
  @ApiOperation({ summary: 'รายการ Change Request ของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.changeRequestsService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('project.view')
  @ApiOperation({ summary: 'ดูรายละเอียด Change Request' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.changeRequestsService.findOne(id)
  }

  @Patch(':id')
  @Permissions('project.update')
  @ApiOperation({ summary: 'แก้ไข Change Request' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChangeRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.changeRequestsService.update(id, dto, user.id)
  }

  @Patch(':id/approve')
  @Permissions('project.update')
  @ApiOperation({ summary: 'อนุมัติ Change Request' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveChangeRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.changeRequestsService.approve(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('project.update')
  @ApiOperation({ summary: 'เปลี่ยนสถานะ Change Request' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChangeRequestStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.changeRequestsService.updateStatus(id, dto, user.id)
  }
}
