import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserFilterDto } from './dto/user-filter.dto'

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('user.view')
  @ApiOperation({ summary: 'รายการผู้ใช้งาน' })
  findAll(@Query() filter: UserFilterDto) {
    return this.usersService.findAll(filter)
  }

  @Get(':id')
  @Permissions('user.view')
  @ApiOperation({ summary: 'ดูรายละเอียดผู้ใช้งาน' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id)
  }

  @Post()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'สร้างผู้ใช้งานใหม่' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: RequestUser) {
    return this.usersService.create(dto, actor.id)
  }

  @Patch(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'แก้ไขผู้ใช้งาน' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.usersService.update(id, dto, actor.id)
  }

  @Delete(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'ลบผู้ใช้งาน (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: RequestUser) {
    return this.usersService.remove(id, actor.id)
  }
}
