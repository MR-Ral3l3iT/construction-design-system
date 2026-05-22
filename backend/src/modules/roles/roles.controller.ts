import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { RolesService } from './roles.service'
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto'

@ApiTags('Roles')
@ApiBearerAuth('JWT')
@UseGuards(PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'รายการ roles ทั้งหมด' })
  findAll() {
    return this.rolesService.findAll()
  }

  @Get(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'ดูรายละเอียด role' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id)
  }

  @Patch(':id/permissions')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'อัปเดต permissions ของ role' })
  updatePermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolePermissionsDto) {
    return this.rolesService.updatePermissions(id, dto)
  }
}
