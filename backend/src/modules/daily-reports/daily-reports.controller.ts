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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FileCategory } from '@prisma/client'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { StorageService } from '../storage/storage.service'
import { DailyReportsService } from './daily-reports.service'
import {
  CreateDailyReportDto,
  CreateReportItemDto,
  CreateReportIssueDto,
  QueryDailyReportDto,
  UpdateDailyReportDto,
  UpdateReportItemDto,
  UpdateReportIssueDto,
} from './dto/daily-report.dto'

@ApiBearerAuth()
@ApiTags('Daily Reports')
@Controller('daily-reports')
export class DailyReportsController {
  constructor(
    private readonly service: DailyReportsService,
    private readonly storage: StorageService,
  ) {}

  // ─── Reports ───────────────────────────────────────────────────────────────

  @Get()
  @Permissions('daily.view')
  @ApiOperation({ summary: 'รายการรายงานประจำวัน' })
  findAll(@Query() query: QueryDailyReportDto) {
    return this.service.findByProject(query)
  }

  @Get('project-summaries')
  @Permissions('daily.view')
  @ApiOperation({ summary: 'สรุปรายงานประจำวันแยกตามโครงการ' })
  findProjectSummaries() {
    return this.service.findProjectSummaries()
  }

  @Get('project-issues')
  @Permissions('daily.view')
  @ApiOperation({ summary: 'ปัญหาทั้งหมดจากรายงานประจำวันของโครงการ' })
  findProjectIssues(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.service.findIssuesByProject(projectId)
  }

  @Get(':id')
  @Permissions('daily.view')
  @ApiOperation({ summary: 'รายงานประจำวัน (พร้อมรายการงานและปัญหา)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Permissions('daily.create')
  @ApiOperation({ summary: 'สร้างรายงานประจำวัน' })
  create(@Body() dto: CreateDailyReportDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.id)
  }

  @Patch(':id')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'แก้ไขรายงานประจำวัน' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDailyReportDto) {
    return this.service.update(id, dto)
  }

  @Patch(':id/publish')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'เผยแพร่รายงาน' })
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.service.publish(id)
  }

  @Delete(':id')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'ลบรายงานประจำวัน' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  @Post(':id/items')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'เพิ่มรายการงาน' })
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateReportItemDto) {
    return this.service.addItem(id, dto)
  }

  @Patch('items/:itemId')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'แก้ไขรายการงาน' })
  updateItem(@Param('itemId', ParseIntPipe) itemId: number, @Body() dto: UpdateReportItemDto) {
    return this.service.updateItem(itemId, dto)
  }

  @Delete('items/:itemId')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'ลบรายการงาน' })
  removeItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.service.removeItem(itemId)
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  @Post('items/:itemId/images')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'อัปโหลดรูปภาพประกอบรายการงาน' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { storage: undefined, limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async addImage(
    @Param('itemId', ParseIntPipe) itemId: number,
    @UploadedFile() file: Express.Multer.File,
    @Query('caption') caption: string | undefined,
    @Query('imageType') imageType: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    const asset = await this.storage.upload(file, { category: FileCategory.IMAGE }, user.id)
    return this.service.addImage(itemId, asset.url ?? '', asset.storageKey, caption, imageType)
  }

  @Delete('images/:imageId')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'ลบรูปภาพ' })
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.service.removeImage(imageId)
  }

  // ─── Issues ────────────────────────────────────────────────────────────────

  @Post(':id/issues')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'เพิ่มปัญหา' })
  addIssue(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateReportIssueDto) {
    return this.service.addIssue(id, dto)
  }

  @Patch('issues/:issueId')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'แก้ไขปัญหา' })
  updateIssue(@Param('issueId', ParseIntPipe) issueId: number, @Body() dto: UpdateReportIssueDto) {
    return this.service.updateIssue(issueId, dto)
  }

  @Delete('issues/:issueId')
  @Permissions('daily.create')
  @ApiOperation({ summary: 'ลบปัญหา' })
  removeIssue(@Param('issueId', ParseIntPipe) issueId: number) {
    return this.service.removeIssue(issueId)
  }
}
