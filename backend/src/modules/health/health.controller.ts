import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { PrismaService } from '../../database/prisma.service'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const start = Date.now()

    let dbStatus: 'ok' | 'error' = 'ok'
    let dbLatencyMs = 0

    try {
      await this.prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - start
    } catch {
      dbStatus = 'error'
    }

    const memUsage = process.memoryUsage()
    const uptimeSec = Math.floor(process.uptime())

    const status = dbStatus === 'ok' ? 'ok' : 'degraded'

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: uptimeSec,
      database: { status: dbStatus, latencyMs: dbLatencyMs },
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
    }
  }
}
