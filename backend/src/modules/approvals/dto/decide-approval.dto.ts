import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class DecideApprovalDto {
  @ApiPropertyOptional({ description: 'หมายเหตุประกอบการอนุมัติหรือปฏิเสธ' })
  @IsOptional()
  @IsString()
  note?: string
}
