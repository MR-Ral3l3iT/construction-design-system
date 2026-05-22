import { ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { EstimateStatus } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'
import { CreateEstimateDto } from './create-estimate.dto'

export class UpdateEstimateDto extends PartialType(CreateEstimateDto) {}

export class UpdateEstimateStatusDto {
  @ApiPropertyOptional({ enum: EstimateStatus })
  @IsEnum(EstimateStatus)
  status: EstimateStatus

  @ApiPropertyOptional()
  @IsOptional()
  notes?: string
}
