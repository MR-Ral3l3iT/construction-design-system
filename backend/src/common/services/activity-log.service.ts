import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

export interface LogPayload {
  userId?: number
  action: string
  module?: string
  /** alias for module */
  targetType?: string
  /** alias for refId */
  targetId?: number
  refId?: number
  description?: string
  metadata?: Record<string, unknown>
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name)

  constructor(private readonly prisma: PrismaService) {}

  async write(payload: LogPayload): Promise<void> {
    try {
      const module = payload.module ?? payload.targetType ?? 'system'
      const refId = payload.refId ?? payload.targetId
      const description =
        payload.description ?? (payload.metadata ? JSON.stringify(payload.metadata) : undefined)

      await this.prisma.activityLog.create({
        data: {
          userId: payload.userId,
          action: payload.action,
          module,
          refId,
          description,
        },
      })
    } catch (e) {
      this.logger.warn(`ActivityLog write failed: ${(e as Error).message}`)
    }
  }
}
