import { PrismaClient, UserStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Permissions ──────────────────────────────────────────────────────────────

const PERMISSIONS = [
  // Customer
  { key: 'customer.view', name: 'ดูลูกค้า', group: 'customer' },
  { key: 'customer.create', name: 'สร้างลูกค้า', group: 'customer' },
  { key: 'customer.update', name: 'แก้ไขลูกค้า', group: 'customer' },
  { key: 'customer.delete', name: 'ลบลูกค้า', group: 'customer' },
  // Project
  { key: 'project.view', name: 'ดูโครงการ', group: 'project' },
  { key: 'project.create', name: 'สร้างโครงการ', group: 'project' },
  { key: 'project.update', name: 'แก้ไขโครงการ', group: 'project' },
  { key: 'project.delete', name: 'ลบโครงการ', group: 'project' },
  // Estimate
  { key: 'estimate.view', name: 'ดูใบประเมิน', group: 'estimate' },
  { key: 'estimate.create', name: 'สร้างใบประเมิน', group: 'estimate' },
  { key: 'estimate.update', name: 'แก้ไขใบประเมิน', group: 'estimate' },
  { key: 'estimate.delete', name: 'ลบใบประเมิน', group: 'estimate' },
  // Design
  { key: 'design.view', name: 'ดูงานออกแบบ', group: 'design' },
  { key: 'design.create', name: 'สร้างงานออกแบบ', group: 'design' },
  { key: 'design.update', name: 'แก้ไขงานออกแบบ', group: 'design' },
  // BOQ
  { key: 'boq.view', name: 'ดู BOQ', group: 'boq' },
  { key: 'boq.create', name: 'สร้าง BOQ', group: 'boq' },
  { key: 'boq.update', name: 'แก้ไข BOQ', group: 'boq' },
  { key: 'boq.approve', name: 'อนุมัติ BOQ', group: 'boq' },
  // Contract
  { key: 'contract.view', name: 'ดูสัญญา', group: 'contract' },
  { key: 'contract.create', name: 'สร้างสัญญา', group: 'contract' },
  { key: 'contract.update', name: 'แก้ไขสัญญา', group: 'contract' },
  // Payment
  { key: 'payment.view', name: 'ดูงวดเงิน', group: 'payment' },
  { key: 'payment.update', name: 'อัปเดตงวดเงิน', group: 'payment' },
  // Construction
  { key: 'construction.view', name: 'ดูแผนงาน', group: 'construction' },
  { key: 'construction.manage', name: 'จัดการแผนงาน', group: 'construction' },
  // Daily Update
  { key: 'daily.view', name: 'ดูอัปเดตรายวัน', group: 'daily' },
  { key: 'daily.create', name: 'สร้างอัปเดตรายวัน', group: 'daily' },
  { key: 'daily.publish', name: 'เผยแพร่อัปเดตรายวัน', group: 'daily' },
  // Issue
  { key: 'issue.view', name: 'ดูปัญหา', group: 'issue' },
  { key: 'issue.create', name: 'แจ้งปัญหา', group: 'issue' },
  { key: 'issue.update', name: 'แก้ไขปัญหา', group: 'issue' },
  // File
  { key: 'file.view', name: 'ดูเอกสาร', group: 'file' },
  { key: 'file.upload', name: 'อัปโหลดเอกสาร', group: 'file' },
  { key: 'file.delete', name: 'ลบเอกสาร', group: 'file' },
  // Team / User
  { key: 'user.view', name: 'ดูทีมงาน', group: 'user' },
  { key: 'user.manage', name: 'จัดการทีมงาน', group: 'user' },
  // Dashboard
  { key: 'dashboard.view', name: 'ดู Dashboard', group: 'dashboard' },
]

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES_CONFIG = [
  {
    name: 'ADMIN',
    description: 'ผู้ดูแลระบบ — เข้าถึงได้ทุกอย่าง',
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: 'SALE',
    description: 'ทีมขาย',
    permissions: [
      'customer.view',
      'customer.create',
      'customer.update',
      'project.view',
      'project.create',
      'project.update',
      'estimate.view',
      'estimate.create',
      'estimate.update',
      'dashboard.view',
    ],
  },
  {
    name: 'DESIGNER',
    description: 'ทีมออกแบบ',
    permissions: [
      'project.view',
      'design.view',
      'design.create',
      'design.update',
      'file.view',
      'file.upload',
      'daily.view',
    ],
  },
  {
    name: 'ESTIMATOR',
    description: 'ทีมถอดแบบ / ประเมินราคา',
    permissions: [
      'project.view',
      'estimate.view',
      'estimate.create',
      'estimate.update',
      'boq.view',
      'boq.create',
      'boq.update',
      'file.view',
      'file.upload',
    ],
  },
  {
    name: 'PROJECT_MANAGER',
    description: 'ผู้จัดการโครงการ',
    permissions: [
      'customer.view',
      'project.view',
      'project.update',
      'estimate.view',
      'design.view',
      'boq.view',
      'boq.approve',
      'contract.view',
      'contract.create',
      'contract.update',
      'payment.view',
      'payment.update',
      'construction.view',
      'construction.manage',
      'daily.view',
      'issue.view',
      'issue.create',
      'issue.update',
      'file.view',
      'file.upload',
      'dashboard.view',
    ],
  },
  {
    name: 'SITE_ENGINEER',
    description: 'วิศวกรหน้างาน / หัวหน้างาน',
    permissions: [
      'project.view',
      'construction.view',
      'construction.manage',
      'daily.view',
      'daily.create',
      'daily.publish',
      'issue.view',
      'issue.create',
      'issue.update',
      'file.view',
      'file.upload',
    ],
  },
  {
    name: 'ACCOUNTANT',
    description: 'บัญชี / การเงิน',
    permissions: [
      'project.view',
      'contract.view',
      'payment.view',
      'payment.update',
      'file.view',
      'dashboard.view',
    ],
  },
  {
    name: 'CUSTOMER',
    description: 'ลูกค้า — เข้าถึงเฉพาะ Client Portal',
    permissions: [
      'project.view',
      'design.view',
      'boq.view',
      'contract.view',
      'payment.view',
      'daily.view',
      'issue.view',
      'issue.create',
      'file.view',
    ],
  },
]

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Array<{
  type: string
  name: string
  phases: Array<{ name: string; tasks: Array<{ title: string; isOptional?: boolean }> }>
}> = [
  {
    type: 'DESIGN_ONLY',
    name: 'งานออกแบบอย่างเดียว',
    phases: [
      {
        name: 'Phase 1 — Pre Design',
        tasks: [
          { title: 'รับ Requirement ลูกค้า' },
          { title: 'นัดสำรวจหน้างาน' },
          { title: 'วัดพื้นที่' },
          { title: 'ถ่ายรูปพื้นที่' },
          { title: 'สรุปความต้องการลูกค้า' },
          { title: 'ประเมินงบประมาณเบื้องต้น' },
          { title: 'เสนอราคาออกแบบ' },
          { title: 'ลูกค้าอนุมัติราคา' },
        ],
      },
      {
        name: 'Phase 2 — Concept Design',
        tasks: [
          { title: 'จัดทำ Mood & Tone' },
          { title: 'จัดทำ Concept Design' },
          { title: 'จัดทำ Layout Plan' },
          { title: 'จัดทำ Space Planning' },
          { title: 'ประชุมสรุป Concept' },
          { title: 'ลูกค้า Review Concept' },
          { title: 'แก้ไข Concept', isOptional: true },
          { title: 'ลูกค้าอนุมัติ Concept' },
        ],
      },
      {
        name: 'Phase 3 — Design Development',
        tasks: [
          { title: 'เขียนแบบแปลน' },
          { title: 'เขียนแบบเฟอร์นิเจอร์' },
          { title: 'เขียนแบบไฟฟ้า' },
          { title: 'เขียนแบบแสงสว่าง' },
          { title: 'เขียนแบบฝ้าเพดาน' },
          { title: 'เขียนแบบพื้น' },
          { title: 'เขียนแบบผนัง' },
          { title: 'ทำ 3D Perspective' },
          { title: 'Render ภาพ' },
          { title: 'แก้ไขแบบรอบที่ 1', isOptional: true },
          { title: 'แก้ไขแบบรอบที่ 2', isOptional: true },
          { title: 'ลูกค้าอนุมัติแบบ' },
        ],
      },
      {
        name: 'Phase 4 — Construction Drawing',
        tasks: [
          { title: 'จัดทำแบบก่อสร้าง' },
          { title: 'ตรวจสอบแบบ' },
          { title: 'Export PDF' },
          { title: 'จัดชุดแบบส่งลูกค้า' },
          { title: 'ส่งมอบไฟล์ทั้งหมด' },
          { title: 'ปิดโครงการ' },
        ],
      },
    ],
  },
  {
    type: 'DESIGN_BOQ',
    name: 'ออกแบบ + BOQ',
    phases: [
      {
        name: 'Phase 1 — Pre Design',
        tasks: [
          { title: 'รับ Requirement ลูกค้า' },
          { title: 'นัดสำรวจหน้างาน' },
          { title: 'วัดพื้นที่' },
          { title: 'ถ่ายรูปพื้นที่' },
          { title: 'สรุปความต้องการลูกค้า' },
          { title: 'ประเมินงบประมาณเบื้องต้น' },
          { title: 'เสนอราคาออกแบบ' },
          { title: 'ลูกค้าอนุมัติราคา' },
        ],
      },
      {
        name: 'Phase 2 — Concept Design',
        tasks: [
          { title: 'จัดทำ Mood & Tone' },
          { title: 'จัดทำ Concept Design' },
          { title: 'จัดทำ Layout Plan' },
          { title: 'จัดทำ Space Planning' },
          { title: 'ประชุมสรุป Concept' },
          { title: 'ลูกค้า Review Concept' },
          { title: 'แก้ไข Concept', isOptional: true },
          { title: 'ลูกค้าอนุมัติ Concept' },
        ],
      },
      {
        name: 'Phase 3 — Design Development',
        tasks: [
          { title: 'เขียนแบบแปลน' },
          { title: 'เขียนแบบเฟอร์นิเจอร์' },
          { title: 'เขียนแบบไฟฟ้า' },
          { title: 'เขียนแบบแสงสว่าง' },
          { title: 'เขียนแบบฝ้าเพดาน' },
          { title: 'เขียนแบบพื้น' },
          { title: 'เขียนแบบผนัง' },
          { title: 'ทำ 3D Perspective' },
          { title: 'Render ภาพ' },
          { title: 'แก้ไขแบบรอบที่ 1', isOptional: true },
          { title: 'แก้ไขแบบรอบที่ 2', isOptional: true },
          { title: 'ลูกค้าอนุมัติแบบ' },
        ],
      },
      {
        name: 'Phase 4 — Construction Drawing',
        tasks: [
          { title: 'จัดทำแบบก่อสร้าง' },
          { title: 'ตรวจสอบแบบ' },
          { title: 'Export PDF' },
          { title: 'จัดชุดแบบส่งลูกค้า' },
        ],
      },
      {
        name: 'Phase 5 — BOQ',
        tasks: [
          { title: 'ถอด BOQ จากแบบก่อสร้าง' },
          { title: 'ตรวจสอบ BOQ' },
          { title: 'ประเมินราคา' },
          { title: 'เสนอราคา' },
          { title: 'เจรจาราคา' },
          { title: 'จัดทำเอกสาร BOQ ฉบับสมบูรณ์' },
          { title: 'ส่งมอบแบบและ BOQ แก่ลูกค้า' },
          { title: 'ปิดโครงการ' },
        ],
      },
    ],
  },
  {
    type: 'CONSTRUCTION_ONLY',
    name: 'งานก่อสร้างอย่างเดียว',
    phases: [
      {
        name: 'Phase 1 — Pre Construction',
        tasks: [
          { title: 'รับแบบจากลูกค้า' },
          { title: 'ตรวจสอบแบบ' },
          { title: 'สำรวจหน้างาน' },
          { title: 'ถอด BOQ' },
          { title: 'ประเมินราคา' },
          { title: 'เสนอราคา' },
          { title: 'เจรจาราคา' },
          { title: 'เซ็นสัญญา' },
          { title: 'เก็บมัดจำ' },
          { title: 'วางแผนก่อสร้าง' },
        ],
      },
      {
        name: 'Phase 2 — Site Preparation',
        tasks: [
          { title: 'เคลียร์พื้นที่' },
          { title: 'รื้อถอน', isOptional: true },
          { title: 'ป้องกันพื้นที่' },
          { title: 'เตรียมวัสดุ' },
          { title: 'เตรียมเครื่องมือ' },
          { title: 'เข้างานหน้างาน' },
        ],
      },
      {
        name: 'Phase 3 — Structure Work',
        tasks: [
          { title: 'งานฐานราก' },
          { title: 'งานโครงสร้าง' },
          { title: 'งานเทพื้น' },
          { title: 'งานผนัง' },
          { title: 'งานหลังคา' },
        ],
      },
      {
        name: 'Phase 4 — System Work',
        tasks: [
          { title: 'งานไฟฟ้า' },
          { title: 'งานประปา' },
          { title: 'งานแอร์', isOptional: true },
          { title: 'งานระบบเครือข่าย', isOptional: true },
          { title: 'งาน CCTV', isOptional: true },
        ],
      },
      {
        name: 'Phase 5 — Interior / Finishing',
        tasks: [
          { title: 'งานฝ้า' },
          { title: 'งานพื้น' },
          { title: 'งานทาสี' },
          { title: 'งานบิ้วอิน', isOptional: true },
          { title: 'งานเฟอร์นิเจอร์', isOptional: true },
          { title: 'งานตกแต่ง', isOptional: true },
          { title: 'เก็บรายละเอียด' },
        ],
      },
      {
        name: 'Phase 6 — Handover',
        tasks: [
          { title: 'ตรวจ Defect' },
          { title: 'แก้ Defect' },
          { title: 'ทำความสะอาด' },
          { title: 'ส่งมอบงาน' },
          { title: 'ส่งเอกสาร Warranty' },
          { title: 'ปิดโครงการ' },
        ],
      },
    ],
  },
  {
    type: 'TURNKEY',
    name: 'ออกแบบ + ก่อสร้าง (Turnkey)',
    phases: [
      {
        name: 'Phase 1 — Pre Design',
        tasks: [
          { title: 'รับ Requirement ลูกค้า' },
          { title: 'นัดสำรวจหน้างาน' },
          { title: 'วัดพื้นที่' },
          { title: 'ถ่ายรูปพื้นที่' },
          { title: 'สรุปความต้องการลูกค้า' },
          { title: 'ประเมินงบประมาณเบื้องต้น' },
          { title: 'เสนอราคาออกแบบ' },
          { title: 'ลูกค้าอนุมัติราคา' },
        ],
      },
      {
        name: 'Phase 2 — Concept Design',
        tasks: [
          { title: 'จัดทำ Mood & Tone' },
          { title: 'จัดทำ Concept Design' },
          { title: 'จัดทำ Layout Plan' },
          { title: 'จัดทำ Space Planning' },
          { title: 'ประชุมสรุป Concept' },
          { title: 'ลูกค้า Review Concept' },
          { title: 'แก้ไข Concept', isOptional: true },
          { title: 'ลูกค้าอนุมัติ Concept' },
        ],
      },
      {
        name: 'Phase 3 — Design Development',
        tasks: [
          { title: 'เขียนแบบแปลน' },
          { title: 'เขียนแบบเฟอร์นิเจอร์' },
          { title: 'เขียนแบบไฟฟ้า' },
          { title: 'เขียนแบบแสงสว่าง' },
          { title: 'เขียนแบบฝ้าเพดาน' },
          { title: 'เขียนแบบพื้น' },
          { title: 'เขียนแบบผนัง' },
          { title: 'ทำ 3D Perspective' },
          { title: 'Render ภาพ' },
          { title: 'แก้ไขแบบรอบที่ 1', isOptional: true },
          { title: 'แก้ไขแบบรอบที่ 2', isOptional: true },
          { title: 'ลูกค้าอนุมัติแบบ' },
        ],
      },
      {
        name: 'Phase 4 — Construction Drawing',
        tasks: [
          { title: 'จัดทำแบบก่อสร้าง' },
          { title: 'ตรวจสอบแบบ' },
          { title: 'Export PDF' },
          { title: 'จัดชุดแบบส่งลูกค้า' },
        ],
      },
      {
        name: 'Phase 5 — BOQ & Contract',
        tasks: [
          { title: 'ถอด BOQ' },
          { title: 'ประเมินราคา' },
          { title: 'เสนอราคาก่อสร้าง' },
          { title: 'เจรจาราคา' },
          { title: 'เซ็นสัญญา' },
          { title: 'เก็บมัดจำ' },
          { title: 'วางแผนก่อสร้าง' },
        ],
      },
      {
        name: 'Phase 6 — Site Preparation',
        tasks: [
          { title: 'เคลียร์พื้นที่' },
          { title: 'รื้อถอน', isOptional: true },
          { title: 'ป้องกันพื้นที่' },
          { title: 'เตรียมวัสดุ' },
          { title: 'เตรียมเครื่องมือ' },
          { title: 'เข้างานหน้างาน' },
        ],
      },
      {
        name: 'Phase 7 — Construction',
        tasks: [
          { title: 'งานฐานราก' },
          { title: 'งานโครงสร้าง' },
          { title: 'งานเทพื้น' },
          { title: 'งานผนัง' },
          { title: 'งานหลังคา' },
          { title: 'งานไฟฟ้า' },
          { title: 'งานประปา' },
          { title: 'งานแอร์', isOptional: true },
          { title: 'งานระบบเครือข่าย', isOptional: true },
          { title: 'งาน CCTV', isOptional: true },
        ],
      },
      {
        name: 'Phase 8 — Finishing',
        tasks: [
          { title: 'งานฝ้า' },
          { title: 'งานพื้น' },
          { title: 'งานทาสี' },
          { title: 'งานบิ้วอิน', isOptional: true },
          { title: 'งานเฟอร์นิเจอร์', isOptional: true },
          { title: 'งานตกแต่ง', isOptional: true },
          { title: 'เก็บรายละเอียด' },
        ],
      },
      {
        name: 'Phase 9 — Handover',
        tasks: [
          { title: 'ตรวจ Defect' },
          { title: 'แก้ Defect' },
          { title: 'ทำความสะอาด' },
          { title: 'ส่งมอบงาน' },
          { title: 'ส่งเอกสาร Warranty' },
          { title: 'ปิดโครงการ' },
        ],
      },
    ],
  },
]

async function seedTemplates() {
  for (const tmpl of TEMPLATES) {
    const existing = await prisma.projectPlanTemplate.findUnique({ where: { type: tmpl.type } })
    if (existing) {
      console.log(`    skip template ${tmpl.type} (already exists)`)
      continue
    }
    await prisma.projectPlanTemplate.create({
      data: {
        name: tmpl.name,
        type: tmpl.type,
        phases: {
          create: tmpl.phases.map((ph, pi) => ({
            name: ph.name,
            sortOrder: pi,
            tasks: {
              create: ph.tasks.map((t, ti) => ({
                title: t.title,
                isOptional: t.isOptional ?? false,
                sortOrder: ti,
              })),
            },
          })),
        },
      },
    })
    console.log(`    created template ${tmpl.type}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding database...')

  // 1. Permissions
  console.log('  → upsert permissions')
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, group: p.group },
      create: p,
    })
  }

  // 2. Roles + RolePermissions
  console.log('  → upsert roles & permissions')
  for (const r of ROLES_CONFIG) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    })

    // Clear old permissions then re-link
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    for (const key of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { key } })
      if (perm) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        })
      }
    }
  }

  // 3. Admin user
  console.log('  → upsert admin user')
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } })
  const hash = await bcrypt.hash('Admin@1234', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@construction.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@construction.local',
      password: hash,
      status: UserStatus.ACTIVE,
    },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  })

  // 4. Demo customer + project
  console.log('  → upsert demo data')
  const customer = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'ลูกค้าทดสอบ',
      email: 'demo@example.com',
      phone: '081-000-0000',
      leadStatus: 'CLOSED_WON',
    },
  })

  await prisma.project.upsert({
    where: { code: 'PRJ-2026-001' },
    update: {},
    create: {
      code: 'PRJ-2026-001',
      name: 'โครงการทดสอบ Turn Key',
      type: 'TURNKEY',
      status: 'CONSTRUCTION',
      customerId: customer.id,
      province: 'กรุงเทพมหานคร',
      description: 'โครงการ demo สำหรับทดสอบระบบ',
      progress: 45,
    },
  })

  // 5. Project Plan Templates
  console.log('  → upsert project plan templates')
  await seedTemplates()

  // 6. Work Categories
  console.log('  → upsert work categories')
  const WORK_CATEGORIES = [
    { name: 'งานโครงสร้าง', color: '#ef4444', order: 1 },
    { name: 'งานสถาปัตยกรรม', color: '#f97316', order: 2 },
    { name: 'งานผนังและฝ้าเพดาน', color: '#eab308', order: 3 },
    { name: 'งานพื้น', color: '#84cc16', order: 4 },
    { name: 'งานทาสี', color: '#22c55e', order: 5 },
    { name: 'งานระบบไฟฟ้า', color: '#06b6d4', order: 6 },
    { name: 'งานระบบประปา', color: '#3b82f6', order: 7 },
    { name: 'งานระบบปรับอากาศ', color: '#8b5cf6', order: 8 },
    { name: 'งานบิ้วอิน', color: '#ec4899', order: 9 },
    { name: 'งานเฟอร์นิเจอร์', color: '#f43f5e', order: 10 },
    { name: 'งานตกแต่ง', color: '#a855f7', order: 11 },
    { name: 'งานภูมิทัศน์', color: '#10b981', order: 12 },
    { name: 'งานรื้อถอน', color: '#6b7280', order: 13 },
    { name: 'งานอื่นๆ', color: '#9ca3af', order: 14 },
  ]
  for (const cat of WORK_CATEGORIES) {
    const existing = await prisma.workCategory.findFirst({ where: { name: cat.name } })
    if (!existing) {
      await prisma.workCategory.create({ data: cat })
      console.log(`    created work category: ${cat.name}`)
    }
  }

  console.log('✅  Seed complete')
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
