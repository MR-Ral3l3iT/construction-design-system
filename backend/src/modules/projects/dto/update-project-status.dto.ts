import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProjectStatus } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpdateProjectStatusDto {
  @ApiProperty({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  status: ProjectStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateProjectProgressDto {
  @ApiProperty({ example: 45 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number
}

export class AddProjectMemberDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  userId: number

  @ApiPropertyOptional({ example: 'ผู้จัดการโครงการ' })
  @IsOptional()
  @IsString()
  role?: string
}
