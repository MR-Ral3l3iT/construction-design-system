import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PermissionsService } from './permissions.service'

@ApiTags('Permissions')
@ApiBearerAuth('JWT')
@UseGuards(PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'รายการ permissions ทั้งหมด (flat)' })
  findAll() {
    return this.permissionsService.findAll()
  }

  @Get('grouped')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'รายการ permissions จัดกลุ่มตาม module' })
  findGrouped() {
    return this.permissionsService.findAllGrouped()
  }
}
