import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { CreateSiteDailyUpdateDto, CreateSiteIssueDto, SiteService } from './site.service'

@ApiBearerAuth()
@ApiTags('Site Portal')
@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('projects')
  @ApiOperation({ summary: 'โครงการที่ฉันรับผิดชอบ' })
  getProjects(@CurrentUser() user: RequestUser) {
    return this.siteService.getAssignedProjects(user.id, user.roles.includes('ADMIN'))
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'รายละเอียดโครงการ' })
  getProject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.siteService.getProject(id, user.id, user.roles.includes('ADMIN'))
  }

  @Get('projects/:id/daily-updates')
  @ApiOperation({ summary: 'รายการ daily update ล่าสุด' })
  getRecentUpdates(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.siteService.getRecentUpdates(id, user.id, user.roles.includes('ADMIN'))
  }

  @Post('projects/:id/daily-updates')
  @ApiOperation({ summary: 'สร้าง daily update' })
  createDailyUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSiteDailyUpdateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.siteService.createDailyUpdate(id, user.id, user.roles.includes('ADMIN'), dto)
  }

  @Post('projects/:id/issues')
  @ApiOperation({ summary: 'แจ้งปัญหา' })
  createIssue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSiteIssueDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.siteService.createIssue(id, user.id, user.roles.includes('ADMIN'), dto)
  }
}
