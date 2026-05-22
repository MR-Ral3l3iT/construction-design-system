import { ApiPropertyOptional } from '@nestjs/swagger'
import { CustomerType, LeadStatus } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'
import { SearchDto } from '../../../common/dto/pagination.dto'

export class FilterCustomerDto extends SearchDto {
  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus
}
