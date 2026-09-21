import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AccountType } from '@prisma/client'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { AccountingSettingsService } from './accounting-settings.service'
import { DocumentSequenceService } from './document-sequence.service'
import {
  CloseFiscalPeriodDto,
  CreateChartOfAccountDto,
  CreateWhtRateDto,
  UpdateChartOfAccountDto,
  UpdateWhtRateDto,
} from './dto/accounting-settings.dto'

@ApiBearerAuth()
@ApiTags('Accounting Settings')
@Controller('chart-of-accounts')
export class ChartOfAccountsController {
  constructor(private readonly settings: AccountingSettingsService) {}

  @Get()
  @Permissions('transaction.view')
  @ApiOperation({ summary: 'ผังบัญชีแบบ tree' })
  @ApiQuery({ name: 'type', enum: AccountType, required: false })
  @ApiQuery({ name: 'includeInactive', type: Boolean, required: false })
  list(
    @Query('type') type?: AccountType,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.settings.listAccounts(type, includeInactive ?? false)
  }

  @Get('options')
  @Permissions('transaction.view')
  @ApiOperation({ summary: 'ผังบัญชีแบบรายการแบน สำหรับ dropdown' })
  options(@Query('type') type?: AccountType) {
    return this.settings.listAccountOptions(type)
  }

  @Post()
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'เพิ่มบัญชีในผังบัญชี' })
  create(@Body() dto: CreateChartOfAccountDto, @CurrentUser() user: RequestUser) {
    return this.settings.createAccount(dto, user.id)
  }

  @Patch(':id')
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'แก้ไขบัญชี' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChartOfAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.settings.updateAccount(id, dto, user.id)
  }

  @Delete(':id')
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'ลบบัญชี' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.settings.removeAccount(id, user.id)
  }
}

@ApiBearerAuth()
@ApiTags('Accounting Settings')
@Controller('wht-rates')
export class WhtRatesController {
  constructor(private readonly settings: AccountingSettingsService) {}

  @Get()
  @Permissions('document.view')
  @ApiOperation({ summary: 'อัตราหัก ณ ที่จ่าย สำหรับ dropdown' })
  list(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.settings.listWhtRates(includeInactive ?? false)
  }

  @Post()
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'เพิ่มอัตราหัก ณ ที่จ่าย' })
  create(@Body() dto: CreateWhtRateDto, @CurrentUser() user: RequestUser) {
    return this.settings.createWhtRate(dto, user.id)
  }

  @Patch(':id')
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'แก้ไขอัตราหัก ณ ที่จ่าย' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWhtRateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.settings.updateWhtRate(id, dto, user.id)
  }
}

@ApiBearerAuth()
@ApiTags('Accounting Settings')
@Controller('fiscal-periods')
export class FiscalPeriodsController {
  constructor(private readonly settings: AccountingSettingsService) {}

  @Get()
  @Permissions('accounting.report')
  @ApiOperation({ summary: 'รายการงวดบัญชี' })
  list(@Query('year', new ParseIntPipe({ optional: true })) year?: number) {
    return this.settings.listFiscalPeriods(year)
  }

  @Post('close')
  @Permissions('accounting.close')
  @ApiOperation({ summary: 'ปิดงวดบัญชี — ห้ามบันทึกรายการย้อนหลัง' })
  close(@Body() dto: CloseFiscalPeriodDto, @CurrentUser() user: RequestUser) {
    return this.settings.closeFiscalPeriod(dto, user.id)
  }

  @Post(':id/reopen')
  @Permissions('accounting.close')
  @ApiOperation({ summary: 'เปิดงวดบัญชีที่ปิดไปแล้ว' })
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.settings.reopenFiscalPeriod(id, user.id)
  }
}

@ApiBearerAuth()
@ApiTags('Accounting Settings')
@Controller('document-sequences')
export class DocumentSequencesController {
  constructor(private readonly sequences: DocumentSequenceService) {}

  @Get()
  @Permissions('accounting.settings')
  @ApiOperation({ summary: 'เลขที่เอกสารล่าสุดและเลขถัดไปของแต่ละประเภท' })
  list() {
    return this.sequences.listCurrent()
  }
}
