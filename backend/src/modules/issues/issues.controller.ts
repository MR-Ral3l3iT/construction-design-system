import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateIssueDto, UpdateIssueDto, UpdateIssueStatusDto } from './dto/issue.dto'
import { IssuesService } from './issues.service'

@ApiBearerAuth()
@ApiTags('Issues')
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @Permissions('issue.create')
  @ApiOperation({ summary: 'แจ้งปัญหา' })
  create(@Body() dto: CreateIssueDto, @CurrentUser() user: RequestUser) {
    return this.issuesService.create(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('issue.view')
  @ApiOperation({ summary: 'รายการปัญหาของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.issuesService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('issue.view')
  @ApiOperation({ summary: 'ดูรายละเอียดปัญหา' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.findOne(id)
  }

  @Patch(':id')
  @Permissions('issue.update')
  @ApiOperation({ summary: 'แก้ไขปัญหา' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.issuesService.update(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('issue.update')
  @ApiOperation({ summary: 'อัปเดตสถานะปัญหา' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.issuesService.updateStatus(id, dto, user.id)
  }
}
