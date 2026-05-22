import { PrismaService } from '../../database/prisma.service'

type CodePrefix = 'PRJ' | 'EST' | 'BOQ' | 'QT' | 'CON' | 'DS' | 'CN' | 'DC'

const modelMap: Record<CodePrefix, keyof PrismaService> = {
  PRJ: 'project',
  EST: 'estimate',
  BOQ: 'bOQ',
  QT: 'quotation',
  CON: 'contract',
  DS: 'project',
  CN: 'project',
  DC: 'project',
}

export async function generateCode(prisma: PrismaService, prefix: CodePrefix): Promise<string> {
  const year = new Date().getFullYear()

  const model = prisma[modelMap[prefix]] as {
    findFirst: (args: object) => Promise<{ code: string } | null>
  }

  const last = await model.findFirst({
    where: { code: { startsWith: `${prefix}-${year}-` } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let seq = 1
  if (last) {
    const parts = last.code.split('-')
    seq = parseInt(parts[parts.length - 1]!, 10) + 1
  }

  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}
