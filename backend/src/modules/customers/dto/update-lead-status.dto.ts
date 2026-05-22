import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { LeadStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  leadStatus: LeadStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
