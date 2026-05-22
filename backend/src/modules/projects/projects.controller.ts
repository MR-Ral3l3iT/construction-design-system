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
import { CreateProjectDto } from './dto/create-project.dto'
import { FilterProjectDto } from './dto/filter-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import {
  AddProjectMemberDto,
  UpdateProjectProgressDto,
  UpdateProjectStatusDto,
} from './dto/update-project-status.dto'
import { ProjectsService } from './projects.service'

@ApiBearerAuth()
@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Permissions('project.create')
  @ApiOperation({ summary: 'สร้างโครงการใหม่' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: RequestUser) {
    return this.projectsService.create(dto, user.id)
  }

  @Get()
  @Permissions('project.view')
  @ApiOperation({ summary: 'รายการโครงการ' })
  findAll(@Query() filter: FilterProjectDto) {
    return this.projectsService.findAll(filter)
  }

  @Get('overview')
  @Permissions('project.view')
  @ApiOperation({ summary: 'ภาพรวมโครงการ' })
  overview() {
    return this.projectsService.overview()
  }

  @Get(':id')
  @Permissions('project.view')
  @ApiOperation({ summary: 'ดูรายละเอียดโครงการ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id)
  }

  @Patch(':id')
  @Permissions('project.update')
  @ApiOperation({ summary: 'แก้ไขข้อมูลโครงการ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.update(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('project.update')
  @ApiOperation({ summary: 'อัปเดตสถานะโครงการ' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.updateStatus(id, dto, user.id)
  }

  @Patch(':id/progress')
  @Permissions('project.update')
  @ApiOperation({ summary: 'อัปเดต progress โครงการ' })
  updateProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectProgressDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.updateProgress(id, dto, user.id)
  }

  @Post(':id/members')
  @Permissions('project.update')
  @ApiOperation({ summary: 'เพิ่มสมาชิกในโครงการ' })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.addMember(id, dto, user.id)
  }

  @Delete(':id/members/:memberId')
  @Permissions('project.update')
  @ApiOperation({ summary: 'ลบสมาชิกออกจากโครงการ' })
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectsService.removeMember(id, memberId, user.id)
  }

  @Delete(':id')
  @Permissions('project.delete')
  @ApiOperation({ summary: 'ลบโครงการ (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.projectsService.remove(id, user.id)
  }
}
