import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { SubQuotationService } from './sub-quotation.service'
import { CreateSubQuotationDto, UpdateSubQuotationDto } from './dto/sub-quotation.dto'

@ApiBearerAuth()
@ApiTags('Sub-Quotation')
@UseGuards(JwtAuthGuard)
@Controller('sub-quotation')
export class SubQuotationController {
  constructor(private readonly service: SubQuotationService) {}

  @Get('quotation/:quotationId')
  @ApiOperation({ summary: 'ดึงใบเสนอราคาย่อยทั้งหมดของ Quotation' })
  findByQuotation(@Param('quotationId', ParseIntPipe) quotationId: number) {
    return this.service.findByQuotation(quotationId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดึงใบเสนอราคาย่อยตาม id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'สร้างใบเสนอราคาย่อย' })
  create(@Body() dto: CreateSubQuotationDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขใบเสนอราคาย่อย' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubQuotationDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ลบใบเสนอราคาย่อย' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
