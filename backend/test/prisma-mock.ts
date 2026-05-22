/**
 * PrismaService mock for unit tests.
 * Provides jest.fn() stubs for all commonly used Prisma model operations.
 * Usage: provide as { provide: PrismaService, useValue: prismaMock() }
 */
export function prismaMock() {
  const makeModel = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  })

  return {
    user: makeModel(),
    role: makeModel(),
    permission: makeModel(),
    userRole: makeModel(),
    rolePermission: makeModel(),
    customer: makeModel(),
    project: makeModel(),
    projectMember: makeModel(),
    estimate: makeModel(),
    estimateItem: makeModel(),
    designTask: makeModel(),
    bOQ: makeModel(),
    bOQCategory: makeModel(),
    bOQSubCategory: makeModel(),
    bOQItem: makeModel(),
    contract: makeModel(),
    paymentMilestone: makeModel(),
    constructionPlan: makeModel(),
    constructionTask: makeModel(),
    dailyUpdate: makeModel(),
    issue: makeModel(),
    changeRequest: makeModel(),
    fileAsset: makeModel(),
    comment: makeModel(),
    approval: makeModel(),
    activityLog: makeModel(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb({})),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }
}
