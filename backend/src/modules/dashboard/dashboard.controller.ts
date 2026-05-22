import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { DashboardService } from './dashboard.service'

@ApiBearerAuth()
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'ภาพรวมระบบ' })
  getSummary() {
    return this.dashboardService.getSummary()
  }
}
