import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { IssueQuotationDto, ListDocumentsQueryDto, VoidDocumentDto } from './dto/documents.dto'
import { DocumentsService } from './documents.service'

@ApiBearerAuth()
@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('from-estimate/:estimateId')
  @Permissions('estimate.update', 'document.create')
  @ApiOperation({ summary: 'ออกใบเสนอราคา (หรือฉบับแก้ไข -R{n}) จากใบประเมิน' })
  issueFromEstimate(
    @Param('estimateId', ParseIntPipe) estimateId: number,
    @Body() dto: IssueQuotationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.issueFromEstimate(estimateId, dto, user.id)
  }

  @Get()
  @Permissions('document.view')
  @ApiOperation({ summary: 'รายการเอกสาร' })
  findAll(@Query() query: ListDocumentsQueryDto) {
    return this.documents.findAll(query)
  }

  @Get(':id')
  @Permissions('document.view')
  @ApiOperation({ summary: 'รายละเอียดเอกสาร' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documents.findOne(id)
  }

  @Get(':id/print-data')
  @Permissions('document.view')
  @ApiOperation({ summary: 'ข้อมูลหน้าพิมพ์ (คำนวณยอดเสร็จแล้ว)' })
  printData(@Param('id', ParseIntPipe) id: number) {
    return this.documents.printData(id)
  }

  @Post(':id/void')
  @Permissions('document.void')
  @ApiOperation({ summary: 'ยกเลิกเอกสาร' })
  void(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoidDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.void(id, dto.reason, user.id)
  }

  @Post(':id/milestones')
  @Permissions('payment.update')
  @ApiOperation({ summary: 'สร้างงวดเงินจากงวดในใบเสนอราคาที่ลูกค้าอนุมัติแล้ว' })
  importMilestones(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.documents.importMilestones(id, user.id)
  }
}
