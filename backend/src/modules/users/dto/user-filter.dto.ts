import { ApiPropertyOptional } from '@nestjs/swagger'
import { UserStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { SearchDto } from '../../../common/dto/pagination.dto'

export class UserFilterDto extends SearchDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string
}
