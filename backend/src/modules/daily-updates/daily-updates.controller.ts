import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateDailyUpdateDto, UpdateDailyUpdateDto } from './dto/daily-update.dto'
import { DailyUpdatesService } from './daily-updates.service'

@ApiBearerAuth()
@ApiTags('Daily Updates')
@Controller('daily-updates')
export class DailyUpdatesController {
  constructor(private readonly dailyUpdatesService: DailyUpdatesService) {}

  @Post()
  @Permissions('daily.create')
  @ApiOperation({ summary: 'สร้างอัปเดตรายวัน' })
  create(@Body() dto: CreateDailyUpdateDto, @CurrentUser() user: RequestUser) {
    return this.dailyUpdatesService.create(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('daily.view')
  @ApiOperation({ summary: 'รายการอัปเดตรายวันของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.dailyUpdatesService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('daily.view')
  @ApiOperation({ summary: 'ดูรายละเอียดอัปเดตรายวัน' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dailyUpdatesService.findOne(id)
  }

  @Patch(':id')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'แก้ไขอัปเดตรายวัน (DRAFT เท่านั้น)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDailyUpdateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.dailyUpdatesService.update(id, dto, user.id)
  }

  @Patch(':id/publish')
  @Permissions('daily.publish')
  @ApiOperation({ summary: 'เผยแพร่อัปเดตรายวัน' })
  publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.dailyUpdatesService.publish(id, user.id)
  }
}
