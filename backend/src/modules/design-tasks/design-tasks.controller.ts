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
import { CreateDesignTaskDto, UpdateDesignTaskStatusDto } from './dto/create-design-task.dto'
import { DesignTasksService } from './design-tasks.service'

@ApiBearerAuth()
@ApiTags('Design Tasks')
@Controller('design-tasks')
export class DesignTasksController {
  constructor(private readonly designTasksService: DesignTasksService) {}

  @Post()
  @Permissions('design.create')
  @ApiOperation({ summary: 'สร้างงานออกแบบ' })
  create(@Body() dto: CreateDesignTaskDto, @CurrentUser() user: RequestUser) {
    return this.designTasksService.create(dto, user.id)
  }

  @Get('task-summary')
  @Permissions('design.view')
  @ApiOperation({ summary: 'สรุปจำนวนงานออกแบบต่อโครงการแยกตามสถานะ' })
  getTaskSummary() {
    return this.designTasksService.getTaskSummary()
  }

  @Get('project/:projectId')
  @Permissions('design.view')
  @ApiOperation({ summary: 'รายการงานออกแบบของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.designTasksService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('design.view')
  @ApiOperation({ summary: 'ดูรายละเอียดงานออกแบบ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.designTasksService.findOne(id)
  }

  @Patch(':id')
  @Permissions('design.update')
  @ApiOperation({ summary: 'แก้ไขงานออกแบบ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateDesignTaskDto>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.designTasksService.update(id, dto, user.id)
  }

  @Delete(':id')
  @Permissions('design.delete')
  @ApiOperation({ summary: 'ลบงานออกแบบ' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.designTasksService.remove(id)
  }

  @Patch(':id/status')
  @Permissions('design.update')
  @ApiOperation({ summary: 'เปลี่ยนสถานะงานออกแบบ' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDesignTaskStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.designTasksService.updateStatus(id, dto, user.id)
  }
}
