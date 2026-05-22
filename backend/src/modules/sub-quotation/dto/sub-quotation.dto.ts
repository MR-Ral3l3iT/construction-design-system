import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDecimal, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateSubQuotationDto {
  @ApiProperty({ description: 'ID ของ Quotation แม่ (ต้องมี boqId)' })
  @IsInt()
  @Min(1)
  quotationId: number

  @ApiProperty({ example: 'งวดที่ 1 — งานฐานราก' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    example: '2500000.00',
    description: 'ยอดงวดนี้ (ต้องไม่เกิน remaining ของ Quotation แม่)',
  })
  @IsDecimal()
  amount: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateSubQuotationDto {
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
  @IsInt()
  @Min(0)
  sortOrder?: number
}
