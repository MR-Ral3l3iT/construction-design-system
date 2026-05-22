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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { CustomersService } from './customers.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { FilterCustomerDto } from './dto/filter-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto'

@ApiBearerAuth()
@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Permissions('customer.create')
  @ApiOperation({ summary: 'สร้างลูกค้าใหม่' })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: RequestUser) {
    return this.customersService.create(dto, user.id)
  }

  @Get()
  @Permissions('customer.view')
  @ApiOperation({ summary: 'รายการลูกค้า' })
  findAll(@Query() filter: FilterCustomerDto) {
    return this.customersService.findAll(filter)
  }

  @Get('lead-funnel')
  @Permissions('customer.view')
  @ApiOperation({ summary: 'สรุปจำนวนลูกค้าต่อ lead status' })
  leadFunnelSummary() {
    return this.customersService.leadFunnelSummary()
  }

  @Get(':id')
  @Permissions('customer.view')
  @ApiOperation({ summary: 'ดูรายละเอียดลูกค้า' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id)
  }

  @Patch(':id')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'แก้ไขข้อมูลลูกค้า' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.customersService.update(id, dto, user.id)
  }

  @Patch(':id/lead-status')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'อัปเดต Lead Status' })
  updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.customersService.updateLeadStatus(id, dto, user.id)
  }

  @Patch(':id/avatar')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'อัปโหลดรูปโปรไฟล์ลูกค้า' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { storage: undefined, limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.customersService.uploadAvatar(id, file, user.id)
  }

  @Post(':id/account')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'สร้างบัญชี Client Portal ให้ลูกค้า' })
  createAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { email: string; password: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.customersService.createAccount(id, dto.email, dto.password, user.id)
  }

  @Patch(':id/account')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'แก้ไขบัญชี Client Portal (email / reset password)' })
  updateAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { email?: string; password?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.customersService.updateAccount(id, dto.email, dto.password, user.id)
  }

  @Delete(':id/account')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'ลบบัญชี Client Portal ของลูกค้า' })
  deleteAccount(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.customersService.deleteAccount(id, user.id)
  }

  @Post(':id/send-credentials')
  @Permissions('customer.update')
  @ApiOperation({ summary: 'ส่งอีเมลข้อมูลเข้าสู่ระบบไปยังลูกค้า' })
  sendCredentials(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.customersService.sendCredentials(id, user.id)
  }

  @Delete(':id')
  @Permissions('customer.delete')
  @ApiOperation({ summary: 'ลบลูกค้า (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.customersService.remove(id, user.id)
  }
}
