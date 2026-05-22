import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { RequestUser } from '../../common/decorators/current-user.decorator'
import { UploadFileDto } from './dto/upload.dto'
import { StorageService } from './storage.service'

@ApiBearerAuth()
@ApiTags('Files')
@Controller('files')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Permissions('file.upload')
  @ApiOperation({ summary: 'อัปโหลดไฟล์' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { storage: undefined, limits: { fileSize: 200 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query() dto: UploadFileDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.storageService.upload(file, dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('file.view')
  @ApiOperation({ summary: 'รายการไฟล์ของโครงการ' })
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.storageService.findByProject(projectId)
  }

  @Get('design-task/:designTaskId')
  @Permissions('file.view')
  @ApiOperation({ summary: 'รายการไฟล์ของงานออกแบบ' })
  findByDesignTask(@Param('designTaskId', ParseIntPipe) designTaskId: number) {
    return this.storageService.findByDesignTask(designTaskId)
  }

  @Get('plan-task/:planTaskId')
  @Permissions('file.view')
  @ApiOperation({ summary: 'รายการไฟล์ของงานในแผน' })
  findByPlanTask(@Param('planTaskId', ParseIntPipe) planTaskId: number) {
    return this.storageService.findByPlanTask(planTaskId)
  }

  @Get('daily-update/:dailyUpdateId')
  @Permissions('file.view')
  @ApiOperation({ summary: 'รายการไฟล์ของรายงานประจำวัน' })
  findByDailyUpdate(@Param('dailyUpdateId', ParseIntPipe) dailyUpdateId: number) {
    return this.storageService.findByDailyUpdate(dailyUpdateId)
  }

  @Get('issue/:issueId')
  @Permissions('file.view')
  @ApiOperation({ summary: 'รายการไฟล์ของปัญหา' })
  findByIssue(@Param('issueId', ParseIntPipe) issueId: number) {
    return this.storageService.findByIssue(issueId)
  }

  @Get('avatars/:filename')
  @Public()
  @ApiOperation({ summary: 'แสดงรูป avatar' })
  async downloadAvatar(@Param('filename') filename: string, @Res() res: Response) {
    if (filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('ไม่พบไฟล์')
    }
    const uploadsDir = path.join(process.cwd(), 'uploads')
    // Check new path first, fall back to old path for backward compat
    const candidates = [
      path.join(uploadsDir, 'avatars', 'customers', filename),
      path.join(uploadsDir, 'avatars', filename),
    ]
    const filePath = candidates.find((p) => fs.existsSync(p))
    if (!filePath) throw new NotFoundException('ไม่พบไฟล์')

    const ext = path.extname(filename).toLowerCase()
    const mime =
      ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp'
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    fs.createReadStream(filePath).pipe(res)
  }

  @Get(':storageKey')
  @Public()
  @ApiOperation({ summary: 'ดาวน์โหลดไฟล์ (signed URL จำลอง)' })
  async download(@Param('storageKey') storageKey: string, @Res() res: Response) {
    const { asset, filePath } = await this.storageService.findOne(storageKey)

    res.setHeader('Content-Type', asset.mimeType ?? 'application/octet-stream')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(asset.originalName)}"`,
    )

    const stream = fs.createReadStream(filePath)
    stream.pipe(res)
  }

  @Delete(':id')
  @Permissions('file.delete')
  @ApiOperation({ summary: 'ลบไฟล์ (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.storageService.remove(id)
  }
}
