import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { EstimateStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator'
import { CreateEstimateDto } from './create-estimate.dto'

export class UpdateEstimateDto extends PartialType(CreateEstimateDto) {
  @ApiPropertyOptional({
    description: 'หัก ณ ที่จ่ายเป็น % — null = ไม่หัก',
    example: 3,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  whtPercent?: number | null
}

export class UpdateEstimateStatusDto {
  @ApiPropertyOptional({ enum: EstimateStatus })
  @IsEnum(EstimateStatus)
  status: EstimateStatus

  @ApiPropertyOptional()
  @IsOptional()
  notes?: string
}

export class ReversePriceDto {
  @ApiProperty({ description: 'ยอดที่ลูกค้าต้องการจ่าย', example: 180000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  targetAmount: number

  @ApiProperty({
    description: 'true = ยอดรับสุทธิหลังหัก ณ ที่จ่าย · false = ยอดรวม VAT (ก่อนหัก ณ ที่จ่าย)',
  })
  @IsBoolean()
  afterWht: boolean

  @ApiPropertyOptional({ description: 'รายการที่จะปรับราคา (ไม่ส่ง = รายการแรกที่มีราคา)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId?: number

  @ApiPropertyOptional({
    description: 'true = บันทึกราคาใหม่ลงรายการ · false = คำนวณให้ดูอย่างเดียว',
  })
  @IsOptional()
  @IsBoolean()
  apply?: boolean
}
