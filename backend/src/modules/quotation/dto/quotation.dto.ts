import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { QuotationStatus } from '@prisma/client'
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateQuotationDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiPropertyOptional({ description: 'สร้างจาก BOQ (snapshot)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  boqId?: number

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional({ default: '0.10', description: 'อัตราค่าดำเนินการ' })
  @IsOptional()
  @IsDecimal()
  mgmtRate?: string

  @ApiPropertyOptional({ default: '0.07', description: 'อัตราภาษีมูลค่าเพิ่ม' })
  @IsOptional()
  @IsDecimal()
  vatRate?: string
}

export class UpdateQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  mgmtRate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  vatRate?: string
}

export class UpdateQuotationStatusDto {
  @ApiProperty({ enum: QuotationStatus })
  @IsEnum(QuotationStatus)
  status: QuotationStatus
}
