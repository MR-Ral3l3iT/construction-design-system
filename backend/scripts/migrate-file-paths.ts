/**
 * migrate-file-paths.ts
 * Reorganizes uploads/ into structured paths:
 *   projects/{pid}/{module}/{entityId}/{uuid}.ext
 *   avatars/customers/{filename}
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/migrate-file-paths.ts
 */

import * as path from 'path'
import * as fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const UPLOADS = path.join(process.cwd(), 'uploads')

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function moveFile(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠️  source not found: ${src}`)
    return false
  }
  ensureDir(path.dirname(dest))
  fs.renameSync(src, dest)
  return true
}

async function migrateFileAssets() {
  console.log('\n📦  Migrating FileAsset records...')

  const files = await prisma.fileAsset.findMany({
    where: { deletedAt: null },
  })

  for (const f of files) {
    const oldRelative = f.filename // currently = storageKey (uuid.ext)
    const oldAbsolute = path.join(UPLOADS, oldRelative)

    // Already migrated (contains a slash = structured path)
    if (oldRelative.includes('/')) {
      console.log(`  ✓ already migrated: ${oldRelative}`)
      continue
    }

    // Determine new relative path
    // Old storageKey format = "uuid.ext" (includes extension), new = pure UUID
    // Use storageKey as the leaf filename (already has ext for old files)
    const storageKeyHasExt = path.extname(f.storageKey) !== ''
    const uuid = storageKeyHasExt ? f.storageKey : f.storageKey
    const ext = storageKeyHasExt ? '' : path.extname(f.filename)

    let newRelative: string
    const pid = f.projectId

    if (f.planTaskId && pid) {
      newRelative = `projects/${pid}/plan-tasks/${f.planTaskId}/${uuid}${ext}`
    } else if (f.designTaskId) {
      // Look up projectId from DesignTask
      const dt = await prisma.designTask.findUnique({
        where: { id: f.designTaskId },
        select: { projectId: true },
      })
      const dpid = dt?.projectId ?? pid
      newRelative = dpid
        ? `projects/${dpid}/design-tasks/${f.designTaskId}/${uuid}${ext}`
        : `general/${uuid}${ext}`
      // Ensure projectId is set in DB if missing
      if (!f.projectId && dpid) {
        await prisma.fileAsset.update({ where: { id: f.id }, data: { projectId: dpid } })
      }
    } else if (f.estimateId && pid) {
      newRelative = `projects/${pid}/estimates/${f.estimateId}/${uuid}${ext}`
    } else if (f.paymentId && pid) {
      newRelative = `projects/${pid}/payments/${f.paymentId}/${uuid}${ext}`
    } else if (f.dailyUpdateId && pid) {
      newRelative = `projects/${pid}/daily-updates/${f.dailyUpdateId}/${uuid}${ext}`
    } else if (f.issueId && pid) {
      newRelative = `projects/${pid}/issues/${f.issueId}/${uuid}${ext}`
    } else if (pid) {
      newRelative = `projects/${pid}/general/${uuid}${ext}`
    } else {
      newRelative = `general/${uuid}${ext}`
    }

    const newAbsolute = path.join(UPLOADS, newRelative)
    const moved = moveFile(oldAbsolute, newAbsolute)

    if (moved) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      await prisma.fileAsset.update({
        where: { id: f.id },
        data: {
          filename: newRelative,
          url: `${baseUrl}/api/v1/files/${f.storageKey}`,
        },
      })
      console.log(`  ✓ ${oldRelative} → ${newRelative}`)
    }
  }
}

async function migrateAvatars() {
  console.log('\n🖼️   Migrating customer avatars...')

  const oldAvatarDir = path.join(UPLOADS, 'avatars')
  const newAvatarDir = path.join(UPLOADS, 'avatars', 'customers')
  ensureDir(newAvatarDir)

  if (!fs.existsSync(oldAvatarDir)) {
    console.log('  avatars/ dir not found, skipping')
    return
  }

  const files = fs.readdirSync(oldAvatarDir).filter((f) => {
    const full = path.join(oldAvatarDir, f)
    return fs.statSync(full).isFile()
  })

  for (const filename of files) {
    const src = path.join(oldAvatarDir, filename)
    const dest = path.join(newAvatarDir, filename)

    if (fs.existsSync(dest)) {
      console.log(`  ✓ already in customers/: ${filename}`)
      continue
    }

    fs.renameSync(src, dest)
    console.log(`  ✓ avatars/${filename} → avatars/customers/${filename}`)
  }

  // Also move loose avatar files from uploads/ root
  const rootFiles = fs.readdirSync(UPLOADS).filter((f) => {
    return f.startsWith('avatar-') && fs.statSync(path.join(UPLOADS, f)).isFile()
  })
  for (const filename of rootFiles) {
    const src = path.join(UPLOADS, filename)
    const dest = path.join(newAvatarDir, filename)
    fs.renameSync(src, dest)
    console.log(`  ✓ uploads/${filename} → avatars/customers/${filename}`)
  }
}

async function main() {
  console.log('🚀  Starting file path migration...')
  try {
    await migrateFileAssets()
    await migrateAvatars()
    console.log('\n✅  Migration complete')
    console.log('\nNew structure:')
    printTree(UPLOADS, '  ', 0, 3)
  } finally {
    await prisma.$disconnect()
  }
}

function printTree(dir: string, indent: string, depth: number, maxDepth: number) {
  if (depth > maxDepth || !fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir)
  for (const entry of entries) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      console.log(`${indent}📁 ${entry}/`)
      printTree(full, indent + '  ', depth + 1, maxDepth)
    } else {
      console.log(`${indent}📄 ${entry}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
