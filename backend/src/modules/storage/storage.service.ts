import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as sharp from 'sharp'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { UploadFileDto } from './dto/upload.dto'

const ALLOWED_MIME: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
}

const ALL_ALLOWED = Object.values(ALLOWED_MIME).flat()

const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  document: 50 * 1024 * 1024,
}

const IMAGE_MAX_PX = 1280
const WEBP_QUALITY = 82

const FILE_SELECT = {
  id: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  category: true,
  url: true,
  storageKey: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.FileAssetSelect

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  readonly uploadDir: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads')
    fs.mkdirSync(this.uploadDir, { recursive: true })
  }

  private getMimeCategory(mimeType: string): string {
    if (ALLOWED_MIME.image.includes(mimeType)) return 'image'
    if (ALLOWED_MIME.video.includes(mimeType)) return 'video'
    return 'document'
  }

  /** Build the relative disk path for a file based on its context */
  private buildRelativePath(dto: UploadFileDto, uuid: string, ext: string): string {
    const pid = dto.projectId
    const base = pid ? `projects/${pid}` : 'general'

    if (dto.planTaskId) return `${base}/plan-tasks/${dto.planTaskId}/${uuid}${ext}`
    if (dto.designTaskId) return `${base}/design-tasks/${dto.designTaskId}/${uuid}${ext}`
    if (dto.estimateId) return `${base}/estimates/${dto.estimateId}/${uuid}${ext}`
    if (dto.paymentId) return `${base}/payments/${dto.paymentId}/${uuid}${ext}`
    if (dto.dailyUpdateId) return `${base}/daily-updates/${dto.dailyUpdateId}/${uuid}${ext}`
    if (dto.issueId) return `${base}/issues/${dto.issueId}/${uuid}${ext}`
    if (dto.changeRequestId) return `${base}/change-requests/${dto.changeRequestId}/${uuid}${ext}`
    if (dto.boqId) return `${base}/boq/${dto.boqId}/${uuid}${ext}`
    if (dto.contractId) return `${base}/contracts/${dto.contractId}/${uuid}${ext}`
    return `${base}/general/${uuid}${ext}`
  }

  private get baseUrl(): string {
    return this.config.get<string>('NEXT_PUBLIC_API_URL') ?? 'http://localhost:3004'
  }

  async upload(file: Express.Multer.File, dto: UploadFileDto, uploadedById: number) {
    const mimeType = file.mimetype

    if (!ALL_ALLOWED.includes(mimeType)) {
      throw new BadRequestException(`ไม่รองรับไฟล์ประเภท ${mimeType}`)
    }

    const mimeCategory = this.getMimeCategory(mimeType)
    const sizeLimit = SIZE_LIMITS[mimeCategory]!
    if (file.size > sizeLimit) {
      throw new BadRequestException(
        `ไฟล์ใหญ่เกินไป: ${mimeCategory} สูงสุด ${sizeLimit / 1024 / 1024} MB`,
      )
    }

    const uuid = crypto.randomUUID()
    let buffer = file.buffer
    let finalMime = mimeType
    let finalExt: string
    let finalSize: number

    if (mimeCategory === 'image') {
      // Resize and convert to WebP
      buffer = await sharp(file.buffer)
        .resize({
          width: IMAGE_MAX_PX,
          height: IMAGE_MAX_PX,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
      finalMime = 'image/webp'
      finalExt = '.webp'
      finalSize = buffer.length
    } else {
      finalExt = path.extname(file.originalname).toLowerCase() || ''
      finalSize = file.size
    }

    const relativePath = this.buildRelativePath(dto, uuid, finalExt)
    const dest = path.join(this.uploadDir, relativePath)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, buffer)

    const storageKey = uuid
    const url = `${this.baseUrl}/api/v1/files/${storageKey}`

    const asset = await this.prisma.fileAsset.create({
      data: {
        filename: relativePath,
        originalName: file.originalname,
        mimeType: finalMime,
        size: finalSize,
        storageKey,
        url,
        category: dto.category ?? 'OTHER',
        uploadedById,
        projectId: dto.projectId,
        estimateId: dto.estimateId,
        designTaskId: dto.designTaskId,
        planTaskId: dto.planTaskId,
        boqId: dto.boqId,
        contractId: dto.contractId,
        paymentId: dto.paymentId,
        dailyUpdateId: dto.dailyUpdateId,
        issueId: dto.issueId,
        changeRequestId: dto.changeRequestId,
      },
      select: FILE_SELECT,
    })

    return asset
  }

  async findByProject(projectId: number) {
    return this.prisma.fileAsset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { projectId },
          { dailyUpdate: { projectId } },
          { issue: { projectId } },
          { designTask: { projectId } },
          { estimate: { projectId } },
          { changeRequest: { projectId } },
        ],
      },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByDesignTask(designTaskId: number) {
    return this.prisma.fileAsset.findMany({
      where: { designTaskId, deletedAt: null },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByPlanTask(planTaskId: number) {
    return this.prisma.fileAsset.findMany({
      where: { planTaskId, deletedAt: null },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByDailyUpdate(dailyUpdateId: number) {
    return this.prisma.fileAsset.findMany({
      where: { dailyUpdateId, deletedAt: null },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByIssue(issueId: number) {
    return this.prisma.fileAsset.findMany({
      where: { issueId, deletedAt: null },
      select: FILE_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(storageKey: string) {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { storageKey, deletedAt: null },
    })
    if (!asset) throw new NotFoundException('ไม่พบไฟล์')

    // filename now stores the relative path; fall back to storageKey for old records
    const relative = asset.filename ?? storageKey
    const filePath = path.join(this.uploadDir, relative)
    if (!fs.existsSync(filePath)) throw new NotFoundException('ไฟล์ไม่พบในระบบ')

    return { asset, filePath }
  }

  async remove(id: number) {
    const asset = await this.prisma.fileAsset.findFirst({ where: { id, deletedAt: null } })
    if (!asset) throw new NotFoundException('ไม่พบไฟล์')

    await this.prisma.fileAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
