import { ApiPropertyOptional } from '@nestjs/swagger'
import { DocStatus, DocType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class IssueQuotationDto {
  @ApiPropertyOptional({ description: 'วันที่เอกสาร (ไม่ส่ง = วันนี้)', example: '2026-10-10' })
  @IsOptional()
  @IsDateString()
  documentDate?: string

  @ApiPropertyOptional({ description: 'อัตราหัก ณ ที่จ่าย (ไม่ส่ง/null = ไม่หัก)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  whtRateId?: number | null

  @ApiPropertyOptional({ description: 'ยืนราคากี่วัน', example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  validDays?: number

  @ApiPropertyOptional({ description: 'หมายเหตุที่พิมพ์ลงเอกสาร' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string
}

export class VoidDocumentDto {
  @ApiPropertyOptional({ example: 'ลูกค้ายกเลิกงาน' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string
}

export class ListDocumentsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DocType })
  @IsOptional()
  @IsEnum(DocType)
  docType?: DocType

  @ApiPropertyOptional({ enum: DocStatus })
  @IsOptional()
  @IsEnum(DocStatus)
  status?: DocStatus

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimateId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string
}
