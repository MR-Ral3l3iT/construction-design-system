import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { CompanyService } from './company.service'
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  UpdateCompanyProfileDto,
} from './dto/company.dto'

@ApiBearerAuth()
@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @Permissions('document.view')
  @ApiOperation({ summary: 'ข้อมูลบริษัทผู้ออกเอกสาร (มีแถวเดียว)' })
  getProfile() {
    return this.companyService.getProfile()
  }

  @Put()
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'แก้ไขข้อมูลบริษัท' })
  updateProfile(@Body() dto: UpdateCompanyProfileDto, @CurrentUser() user: RequestUser) {
    return this.companyService.updateProfile(dto, user.id)
  }

  @Get('bank-accounts')
  @Permissions('document.view')
  @ApiOperation({ summary: 'รายการบัญชีธนาคารของบริษัท' })
  listBankAccounts() {
    return this.companyService.listBankAccounts()
  }

  @Post('bank-accounts')
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'เพิ่มบัญชีธนาคาร' })
  createBankAccount(@Body() dto: CreateBankAccountDto, @CurrentUser() user: RequestUser) {
    return this.companyService.createBankAccount(dto, user.id)
  }

  @Patch('bank-accounts/:id')
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'แก้ไขบัญชีธนาคาร' })
  updateBankAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companyService.updateBankAccount(id, dto, user.id)
  }

  @Delete('bank-accounts/:id')
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'ลบบัญชีธนาคาร' })
  removeBankAccount(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.companyService.removeBankAccount(id, user.id)
  }
}
