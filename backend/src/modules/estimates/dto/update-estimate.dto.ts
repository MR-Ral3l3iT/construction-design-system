import { ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { EstimateStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator'
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
