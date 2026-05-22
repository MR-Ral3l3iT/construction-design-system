import { ApiPropertyOptional } from '@nestjs/swagger'
import { ProjectStatus, ProjectType } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'
import { SearchDto } from '../../../common/dto/pagination.dto'

export class FilterProjectDto extends SearchDto {
  @ApiPropertyOptional({ enum: ProjectType })
  @IsOptional()
  @IsEnum(ProjectType)
  type?: ProjectType

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus
}
