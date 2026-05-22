/**
 * recover-files.ts
 * สแกน uploads/ folder แล้วเพิ่ม FileAsset record กลับเข้า database
 * ใช้เมื่อ record ใน file_assets ถูกลบจาก migrate reset แต่ไฟล์บนดิสก์ยังอยู่
 *
 * วิธีรัน: npx ts-node scripts/recover-files.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient, FileCategory } from '@prisma/client'

const prisma = new PrismaClient()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ─── Mime type mapping ────────────────────────────────────────────────────────
const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
}

// ─── Category mapping from folder path ───────────────────────────────────────
function detectCategory(relativePath: string): FileCategory {
  if (relativePath.includes('/design-tasks/')) return FileCategory.DESIGN
  if (relativePath.includes('/plan-tasks/')) return FileCategory.PLAN
  if (relativePath.includes('/daily-updates/')) return FileCategory.DAILY_UPDATE
  if (relativePath.includes('/issues/')) return FileCategory.ISSUE
  if (relativePath.includes('/boq/')) return FileCategory.BOQ
  if (relativePath.includes('/estimates/')) return FileCategory.OTHER
  if (relativePath.includes('/payments/')) return FileCategory.PAYMENT
  if (relativePath.includes('/contracts/')) return FileCategory.CONTRACT
  if (relativePath.includes('/change-requests/')) return FileCategory.OTHER
  return FileCategory.OTHER
}

// ─── Parse context IDs from path ─────────────────────────────────────────────
function parseContextIds(relativePath: string) {
  const projectMatch = relativePath.match(/projects\/(\d+)\//)
  const designTaskMatch = relativePath.match(/design-tasks\/(\d+)\//)
  const planTaskMatch = relativePath.match(/plan-tasks\/(\d+)\//)
  const dailyUpdateMatch = relativePath.match(/daily-updates\/(\d+)\//)
  const issueMatch = relativePath.match(/issues\/(\d+)\//)
  const boqMatch = relativePath.match(/boq\/(\d+)\//)
  const estimateMatch = relativePath.match(/estimates\/(\d+)\//)
  const paymentMatch = relativePath.match(/payments\/(\d+)\//)
  const contractMatch = relativePath.match(/contracts\/(\d+)\//)
  const changeRequestMatch = relativePath.match(/change-requests\/(\d+)\//)

  return {
    projectId: projectMatch ? parseInt(projectMatch[1]) : null,
    designTaskId: designTaskMatch ? parseInt(designTaskMatch[1]) : null,
    planTaskId: planTaskMatch ? parseInt(planTaskMatch[1]) : null,
    dailyUpdateId: dailyUpdateMatch ? parseInt(dailyUpdateMatch[1]) : null,
    issueId: issueMatch ? parseInt(issueMatch[1]) : null,
    boqId: boqMatch ? parseInt(boqMatch[1]) : null,
    estimateId: estimateMatch ? parseInt(estimateMatch[1]) : null,
    paymentId: paymentMatch ? parseInt(paymentMatch[1]) : null,
    contractId: contractMatch ? parseInt(contractMatch[1]) : null,
    changeRequestId: changeRequestMatch ? parseInt(changeRequestMatch[1]) : null,
  }
}

// ─── Recursively collect files ────────────────────────────────────────────────
function collectFiles(dir: string, baseDir: string): string[] {
  const result: string[] = []
  if (!fs.existsSync(dir)) return result
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath, baseDir))
    } else if (entry.isFile()) {
      result.push(path.relative(baseDir, fullPath))
    }
  }
  return result
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const projectsDir = path.join(UPLOAD_DIR, 'projects')
  const allFiles = collectFiles(projectsDir, UPLOAD_DIR)
    .filter((f) => !f.includes('/avatars/'))
    .map((f) => f.replace(/\\/g, '/')) // normalise Windows paths

  console.log(`พบไฟล์บนดิสก์ทั้งหมด ${allFiles.length} ไฟล์\n`)

  // ดึง storageKey ที่มีอยู่แล้วใน DB
  const existingKeys = new Set(
    (await prisma.fileAsset.findMany({ select: { storageKey: true } })).map((r) => r.storageKey),
  )

  let created = 0
  let skipped = 0
  let errors = 0

  for (const relativePath of allFiles) {
    const filename = path.basename(relativePath)
    const ext = path.extname(filename).toLowerCase()
    const storageKey = filename.replace(ext, '') // UUID part
    const mimeType = MIME_BY_EXT[ext] ?? null
    const fullPath = path.join(UPLOAD_DIR, relativePath)
    const stat = fs.statSync(fullPath)
    const category = detectCategory(relativePath)
    const ids = parseContextIds(relativePath)
    const url = `${BASE_URL}/api/v1/files/${storageKey}`

    if (existingKeys.has(storageKey)) {
      console.log(`  ⏭  ข้าม (มีอยู่แล้ว): ${relativePath}`)
      skipped++
      continue
    }

    // ตรวจสอบว่า projectId ที่อ้างถึงมีอยู่จริง
    if (ids.projectId) {
      const projectExists = await prisma.project.findUnique({ where: { id: ids.projectId } })
      if (!projectExists) {
        console.log(`  ⚠️  ข้าม (ไม่พบโครงการ ${ids.projectId}): ${relativePath}`)
        skipped++
        continue
      }
    }

    try {
      await prisma.fileAsset.create({
        data: {
          filename: relativePath,
          originalName: filename,
          mimeType,
          size: stat.size,
          storageKey,
          url,
          category,
          ...ids,
        },
      })
      console.log(`  ✅  กู้คืน: ${relativePath} (${category})`)
      created++
    } catch (err: unknown) {
      console.error(`  ❌  error ${relativePath}:`, (err as Error).message)
      errors++
    }
  }

  console.log(`\nสรุป: กู้คืน ${created} ไฟล์ | ข้าม ${skipped} | error ${errors}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
