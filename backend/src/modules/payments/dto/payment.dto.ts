import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsDecimal,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

export class CreatePaymentMilestoneDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiPropertyOptional({ description: 'ผูกกับใบเสนอราคา' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quotationId?: number

  @ApiProperty({ example: 'งวดที่ 1 — เริ่มก่อสร้าง' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: '5000000.00' })
  @IsDecimal()
  amount: string

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdatePaymentMilestoneDto {
  @ApiPropertyOptional({ description: 'ผูกกับใบเสนอราคา (null = ยกเลิกการผูก)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quotationId?: number | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  amount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class ImportFromEstimateDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty()
  @IsInt()
  @Min(1)
  estimateId: number
}

export class FromSubQuotationDto {
  @ApiPropertyOptional({ example: '2026-06-01', description: 'กำหนดชำระ (ไม่บังคับ)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string
}

export class MarkPaidDto {
  @ApiPropertyOptional({
    example: '2026-04-15',
    description: 'วันที่จ่ายเงินจริง (default: today)',
  })
  @IsOptional()
  @IsDateString()
  paidDate?: string
}
