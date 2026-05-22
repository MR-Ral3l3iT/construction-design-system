import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import {
  CreateProjectPlanDto,
  UpdateProjectPlanTaskDto,
  AddTaskDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateTemplatePhaseDto,
  UpdateTemplatePhaseDto,
  CreateTemplateTaskDto,
  UpdateTemplateTaskDto,
} from './dto/project-plan.dto'
import { ProjectPlansService } from './project-plans.service'

@ApiBearerAuth()
@ApiTags('Project Plans')
@Controller('project-plans')
export class ProjectPlansController {
  constructor(private readonly projectPlansService: ProjectPlansService) {}

  @Get('templates')
  @Permissions('construction.view')
  @ApiOperation({ summary: 'รายการ template แผนงาน' })
  getTemplates() {
    return this.projectPlansService.getTemplates()
  }

  @Post()
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'สร้างแผนงานจาก template' })
  create(@Body() dto: CreateProjectPlanDto, @CurrentUser() user: RequestUser) {
    return this.projectPlansService.createFromTemplate(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('construction.view')
  @ApiOperation({ summary: 'ดูแผนงานของโครงการ' })
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectPlansService.findByProject(projectId)
  }

  @Get(':id')
  @Permissions('construction.view')
  @ApiOperation({ summary: 'ดูรายละเอียดแผนงาน' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectPlansService.findOne(id)
  }

  @Get(':id/progress')
  @Permissions('construction.view')
  @ApiOperation({ summary: 'ดู progress ภาพรวม' })
  getProgress(@Param('id', ParseIntPipe) id: number) {
    return this.projectPlansService.getProgress(id)
  }

  @Post('phases/:phaseId/tasks')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'เพิ่มงานใน phase' })
  addTask(@Param('phaseId', ParseIntPipe) phaseId: number, @Body() dto: AddTaskDto) {
    return this.projectPlansService.addTaskToPhase(phaseId, dto)
  }

  @Patch('tasks/:taskId')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'อัปเดตงาน' })
  updateTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateProjectPlanTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.projectPlansService.updateTask(taskId, dto, user.id)
  }

  @Delete('tasks/:taskId')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'ลบงาน' })
  deleteTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.projectPlansService.deleteTask(taskId)
  }

  // ─── Template Management ──────────────────────────────────────────────────

  @Post('templates')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'สร้าง template ใหม่' })
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.projectPlansService.createTemplate(dto)
  }

  @Patch('templates/:id')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'แก้ไขชื่อ template' })
  updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.projectPlansService.updateTemplate(id, dto)
  }

  @Delete('templates/:id')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'ลบ template' })
  deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.projectPlansService.deleteTemplate(id)
  }

  @Post('templates/:id/phases')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'เพิ่ม phase ใน template' })
  addTemplatePhase(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTemplatePhaseDto) {
    return this.projectPlansService.addTemplatePhase(id, dto)
  }

  @Patch('template-phases/:phaseId')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'แก้ไข phase ใน template' })
  updateTemplatePhase(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() dto: UpdateTemplatePhaseDto,
  ) {
    return this.projectPlansService.updateTemplatePhase(phaseId, dto)
  }

  @Delete('template-phases/:phaseId')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'ลบ phase ใน template' })
  deleteTemplatePhase(@Param('phaseId', ParseIntPipe) phaseId: number) {
    return this.projectPlansService.deleteTemplatePhase(phaseId)
  }

  @Post('template-phases/:phaseId/tasks')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'เพิ่มงานใน template phase' })
  addTemplateTask(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() dto: CreateTemplateTaskDto,
  ) {
    return this.projectPlansService.addTemplateTask(phaseId, dto)
  }

  @Patch('template-tasks/:taskId')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'แก้ไขงานใน template' })
  updateTemplateTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTemplateTaskDto,
  ) {
    return this.projectPlansService.updateTemplateTask(taskId, dto)
  }

  @Delete('template-tasks/:taskId')
  @Permissions('construction.manage')
  @ApiOperation({ summary: 'ลบงานใน template' })
  deleteTemplateTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.projectPlansService.deleteTemplateTask(taskId)
  }
}
